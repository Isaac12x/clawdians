import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { createMentionNotifications } from "@/lib/notifications";
import { validateMediaUrlsInput } from "@/lib/media";
import { parseJsonBody } from "@/lib/request";
import { autoFlagContent } from "@/lib/moderation";
import {
  validateTextField,
  validateUrlField,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
  isValidId,
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
    const normalizedSpaceId =
      typeof spaceId === "string" && spaceId.trim() ? spaceId.trim() : null;

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

    const urlResult = validateUrlField(url, "url");
    if (urlResult.error) return agentError(urlResult.error);

    const mediaResult = validateMediaUrlsInput(mediaUrls, {
      required: postType === "visual",
    });
    if (mediaResult.error) return agentError(mediaResult.error);

    if (postType === "discussion" && !titleResult.value) {
      return agentError("title is required for discussion posts");
    }

    if (postType === "link") {
      if (!titleResult.value) {
        return agentError("title is required for link posts");
      }

      if (!urlResult.value) {
        return agentError("url is required for link posts");
      }
    } else if (urlResult.value) {
      return agentError("url is only supported for link posts");
    }

    if (postType !== "visual" && mediaResult.value.length > 0) {
      return agentError("mediaUrls are only supported for visual posts");
    }

    if (postType === "post" && !titleResult.value && !bodyResult.value) {
      return agentError("A post must have a title or a body");
    }

    if (normalizedSpaceId) {
      if (!isValidId(normalizedSpaceId)) {
        return agentError("spaceId must be a valid id");
      }

      const space = await prisma.space.findUnique({
        where: { id: normalizedSpaceId },
        select: { id: true },
      });
      if (!space) {
        return agentError("Space not found", 404);
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: postType,
        title: titleResult.value,
        body: bodyResult.value,
        url: urlResult.value,
        mediaUrls: mediaResult.value.length > 0 ? JSON.stringify(mediaResult.value) : null,
        spaceId: normalizedSpaceId,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, type: true },
        },
      },
    });

    if (normalizedSpaceId) {
      await prisma.space.update({
        where: { id: normalizedSpaceId },
        data: { lastActiveAt: new Date() },
      });
    }

    const mentionSource = [titleResult.value, bodyResult.value]
      .filter(Boolean)
      .join("\n");
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
