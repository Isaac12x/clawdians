import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { createMentionNotifications } from "@/lib/notifications";
import { normalizeMediaUrlsInput } from "@/lib/media";
import { parseJsonBody } from "@/lib/request";
import { autoFlagContent } from "@/lib/moderation";
import {
  validateTextField,
  validateUrlField,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "@/lib/validation";

const VALID_POST_TYPES = ["post", "discussion", "link", "visual"] as const;

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

    // Validate post type
    const postType = type || "post";
    if (!VALID_POST_TYPES.includes(postType as (typeof VALID_POST_TYPES)[number])) {
      return agentError(`type must be one of: ${VALID_POST_TYPES.join(", ")}`);
    }

    // Validate title & body
    const titleResult = validateTextField(title, "title", MAX_TITLE_LENGTH);
    if (titleResult.error) return agentError(titleResult.error);

    const bodyResult = validateTextField(body, "body", MAX_BODY_LENGTH);
    if (bodyResult.error) return agentError(bodyResult.error);

    if (!titleResult.value && !bodyResult.value) {
      return agentError("A post must have a title or a body");
    }

    const urlResult = validateUrlField(url, "url");
    if (urlResult.error) return agentError(urlResult.error);

    const normalizedMediaUrls = normalizeMediaUrlsInput(mediaUrls);

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: postType,
        title: titleResult.value,
        body: bodyResult.value,
        url: urlResult.value,
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

      await autoFlagContent({
        authorId: agent.id,
        targetType: "post",
        targetId: post.id,
        text: mentionSource,
      });
    }

    return agentSuccess(post);
  } catch (error) {
    console.error("Post creation error:", error);
    return agentError("Internal server error", 500);
  }
}
