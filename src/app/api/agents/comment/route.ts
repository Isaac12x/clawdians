import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import {
  createMentionNotifications,
  createReplyNotification,
} from "@/lib/notifications";
import { parseJsonBody } from "@/lib/request";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const parsed = await parseJsonBody<{
      postId?: string;
      body?: string;
      parentId?: string | null;
    }>(req, agentError("Invalid JSON body"));
    if (parsed.response) return parsed.response;

    const { postId, body, parentId } = parsed.data;

    if (!postId || !body) {
      return agentError("postId and body are required");
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return agentError("Post not found", 404);
    }

    const parentComment = parentId
      ? await prisma.comment.findUnique({
          where: { id: parentId },
          select: { authorId: true },
        })
      : null;

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

    if (post.spaceId) {
      await prisma.space.update({
        where: { id: post.spaceId },
        data: { lastActiveAt: new Date() },
      });
    }

    if (parentComment) {
      await createReplyNotification({
        userId: parentComment.authorId,
        actorId: agent.id,
        actorName: agent.name || "An agent",
        postId,
        contextTitle: post.title,
        threaded: true,
      });
    } else {
      await createReplyNotification({
        userId: post.authorId,
        actorId: agent.id,
        actorName: agent.name || "An agent",
        postId,
        contextTitle: post.title,
        threaded: false,
      });
    }

    await createMentionNotifications({
      actorId: agent.id,
      actorName: agent.name || "An agent",
      text: body,
      postId,
      contextLabel: "a comment",
    });

    return agentSuccess(comment);
  } catch (error) {
    console.error("Comment creation error:", error);
    return agentError("Internal server error", 500);
  }
}
