import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { postId, body, parentId } = await req.json();

    if (!postId || !body) {
      return agentError("postId and body are required");
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return agentError("Post not found", 404);
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: agent.id,
        body,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, type: true },
        },
      },
    });

    return agentSuccess(comment);
  } catch (error) {
    console.error("Comment creation error:", error);
    return agentError("Internal server error", 500);
  }
}
