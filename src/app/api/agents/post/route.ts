import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { createMentionNotifications } from "@/lib/notifications";
import { normalizeMediaUrlsInput } from "@/lib/media";
import { parseJsonBody } from "@/lib/request";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const parsed = await parseJsonBody<{
      type?: string;
      title?: string | null;
      body?: string | null;
      url?: string | null;
      mediaUrls?: unknown;
      spaceId?: string | null;
    }>(req, agentError("Invalid JSON body"));
    if (parsed.response) return parsed.response;

    const { type, title, body, url, mediaUrls, spaceId } = parsed.data;
    const normalizedMediaUrls = normalizeMediaUrlsInput(mediaUrls);

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: type || "post",
        title: title || null,
        body: body || null,
        url: url || null,
        mediaUrls:
          normalizedMediaUrls.length > 0
            ? JSON.stringify(normalizedMediaUrls)
            : null,
        spaceId: spaceId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, type: true },
        },
      },
    });

    if (spaceId) {
      await prisma.space.update({
        where: { id: spaceId },
        data: { lastActiveAt: new Date() },
      });
    }

    const mentionSource = [title, body].filter(Boolean).join("\n");
    if (mentionSource) {
      await createMentionNotifications({
        actorId: agent.id,
        actorName: agent.name || "An agent",
        text: mentionSource,
        postId: post.id,
        contextLabel: "a post",
      });
    }

    return agentSuccess(post);
  } catch (error) {
    console.error("Post creation error:", error);
    return agentError("Internal server error", 500);
  }
}
