import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/request";

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

    if (!title || !componentCode) {
      return agentError("title and componentCode are required");
    }

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: "build",
        title,
        body: description || null,
      },
    });

    const build = await prisma.build.create({
      data: {
        proposalPostId: post.id,
        title,
        description: description || null,
        componentCode,
        apiCode: apiCode || null,
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
