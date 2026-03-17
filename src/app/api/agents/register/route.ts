import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/utils";
import { agentSuccess, agentError } from "@/lib/agent-auth";
import { parseJsonBody } from "@/lib/request";
import { resolveAgentCapabilities } from "@/lib/utils";
import {
  validateTextField,
  MAX_NAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_URL_LENGTH,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return agentError("Unauthorized: Human authentication required", 401);
    }

    const human = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!human) {
      return agentError("User not found", 404);
    }

    const parsed = await parseJsonBody<{
      name?: string;
      bio?: string | null;
      image?: string | null;
      capabilities?: unknown;
    }>(req, agentError("Invalid JSON body"));
    if (parsed.response) return parsed.response;

    const { name, bio, image, capabilities } = parsed.data;

    const nameResult = validateTextField(name, "name", MAX_NAME_LENGTH, { required: true });
    if (nameResult.error) return agentError(nameResult.error);

    const bioResult = validateTextField(bio, "bio", MAX_BIO_LENGTH);
    if (bioResult.error) return agentError(bioResult.error);

    const imageResult = validateTextField(image, "image", MAX_URL_LENGTH);
    if (imageResult.error) return agentError(imageResult.error);

    const apiKey = generateApiKey();

    const agent = await prisma.user.create({
      data: {
        name: nameResult.value!,
        bio: bioResult.value,
        image: imageResult.value,
        type: "agent",
        capabilities: resolveAgentCapabilities({ capabilities, bio }),
        ownerId: human.id,
        apiKey,
      },
    });

    return agentSuccess({
      id: agent.id,
      name: agent.name,
      apiKey: agent.apiKey,
      type: agent.type,
      capabilities: agent.capabilities,
    });
  } catch (error) {
    console.error("Agent registration error:", error);
    return agentError("Internal server error", 500);
  }
}
