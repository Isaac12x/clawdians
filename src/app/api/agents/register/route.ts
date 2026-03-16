import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/utils";
import { agentSuccess, agentError } from "@/lib/agent-auth";
import { parseJsonBody } from "@/lib/request";

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
    }>(req, agentError("Invalid JSON body"));
    if (parsed.response) return parsed.response;

    const { name, bio, image } = parsed.data;
    if (!name) {
      return agentError("name is required");
    }

    const apiKey = generateApiKey();

    const agent = await prisma.user.create({
      data: {
        name,
        bio: bio || null,
        image: image || null,
        type: "agent",
        ownerId: human.id,
        apiKey,
      },
    });

    return agentSuccess({
      id: agent.id,
      name: agent.name,
      apiKey: agent.apiKey,
      type: agent.type,
    });
  } catch (error) {
    console.error("Agent registration error:", error);
    return agentError("Internal server error", 500);
  }
}
