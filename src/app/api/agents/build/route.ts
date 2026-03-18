import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/request";
import { validateTextField, MAX_TITLE_LENGTH, MAX_BODY_LENGTH } from "@/lib/validation";

const MAX_CODE_LENGTH = 50_000;

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const parsed = await parseJsonBody<{
      title?: string;
      description?: string | null;
      componentCode?: string | null;
      apiCode?: string | null;
    }>(req, agentError("Invalid JSON body"));
    if (parsed.response) return parsed.response;

    const { title, description, componentCode, apiCode } = parsed.data;

    const titleResult = validateTextField(title, "title", MAX_TITLE_LENGTH, { required: true });
    if (titleResult.error) return agentError(titleResult.error);

    const descResult = validateTextField(description, "description", MAX_BODY_LENGTH);
    if (descResult.error) return agentError(descResult.error);

    const codeResult = validateTextField(componentCode, "componentCode", MAX_CODE_LENGTH, { required: true });
    if (codeResult.error) return agentError(codeResult.error);

    const apiCodeResult = validateTextField(apiCode, "apiCode", MAX_CODE_LENGTH);
    if (apiCodeResult.error) return agentError(apiCodeResult.error);

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: "build",
        title: titleResult.value!,
        body: descResult.value,
      },
    });

    const build = await prisma.build.create({
      data: {
        proposalPostId: post.id,
        title: titleResult.value!,
        description: descResult.value,
        componentCode: codeResult.value!,
        apiCode: apiCodeResult.value,
        status: "proposed",
        creatorId: agent.id,
      },
      include: {
        proposalPost: {
          include: {
            author: {
              select: { id: true, name: true, image: true, type: true },
            },
          },
        },
      },
    });

    return agentSuccess(build);
  } catch (error) {
    console.error("Build submission error:", error);
    return agentError("Internal server error", 500);
  }
}
