import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const spaceId = searchParams.get("spaceId");
  const type = searchParams.get("type");
  const authorIds = searchParams
    .get("authorIds")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const sort = searchParams.get("sort") || "new";
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 100);
  const offset = Math.max(rawOffset, 0);

  const where: Record<string, unknown> = {};
  if (spaceId) where.spaceId = spaceId;
  if (type) where.type = type;
  if (authorIds && authorIds.length > 0) {
    where.authorId = { in: authorIds };
  }

  const orderBy =
    sort === "top"
      ? { score: "desc" as const }
      : { createdAt: "desc" as const };

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
      _count: { select: { comments: true } },
    },
    orderBy,
    take: limit,
    skip: offset,
  });

  return Response.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const parsed = await parseJsonBody<{
    type?: string;
    title?: string | null;
    body?: string | null;
    url?: string | null;
    mediaUrls?: unknown;
    spaceId?: string | null;
  }>(req);
  if (parsed.response) return parsed.response;

  const { type, title, body, url, mediaUrls, spaceId } = parsed.data;
  const normalizedSpaceId = typeof spaceId === "string" && spaceId.trim() ? spaceId.trim() : null;

  // Validate post type
  const postType = type || "post";
  if (!VALID_POST_TYPES.includes(postType as (typeof VALID_POST_TYPES)[number])) {
    return Response.json(
      { error: `type must be one of: ${VALID_POST_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate title
  const titleResult = validateTextField(title, "title", MAX_TITLE_LENGTH);
  if (titleResult.error)
    return Response.json({ error: titleResult.error }, { status: 400 });

  // Validate body
  const bodyResult = validateTextField(body, "body", MAX_BODY_LENGTH);
  if (bodyResult.error)
    return Response.json({ error: bodyResult.error }, { status: 400 });

  // Validate URL
  const urlResult = validateUrlField(url, "url");
  if (urlResult.error)
    return Response.json({ error: urlResult.error }, { status: 400 });

  const mediaResult = validateMediaUrlsInput(mediaUrls, {
    required: postType === "visual",
  });
  if (mediaResult.error) {
    return Response.json({ error: mediaResult.error }, { status: 400 });
  }

  if (postType === "discussion" && !titleResult.value) {
    return Response.json(
      { error: "title is required for discussion posts" },
      { status: 400 }
    );
  }

  if (postType === "link") {
    if (!titleResult.value) {
      return Response.json(
        { error: "title is required for link posts" },
        { status: 400 }
      );
    }

    if (!urlResult.value) {
      return Response.json(
        { error: "url is required for link posts" },
        { status: 400 }
      );
    }
  } else if (urlResult.value) {
    return Response.json(
      { error: "url is only supported for link posts" },
      { status: 400 }
    );
  }

  if (postType !== "visual" && mediaResult.value.length > 0) {
    return Response.json(
      { error: "mediaUrls are only supported for visual posts" },
      { status: 400 }
    );
  }

  if (postType === "post" && !titleResult.value && !bodyResult.value) {
    return Response.json(
      { error: "A post must have a title or a body" },
      { status: 400 }
    );
  }

  if (normalizedSpaceId) {
    if (!isValidId(normalizedSpaceId)) {
      return Response.json({ error: "spaceId must be a valid id" }, { status: 400 });
    }

    const space = await prisma.space.findUnique({
      where: { id: normalizedSpaceId },
      select: { id: true },
    });
    if (!space) {
      return Response.json({ error: "Space not found" }, { status: 404 });
    }
  }

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      type: postType,
      title: titleResult.value,
      body: bodyResult.value,
      url: urlResult.value,
      mediaUrls: mediaResult.value.length > 0 ? JSON.stringify(mediaResult.value) : null,
      spaceId: normalizedSpaceId,
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
    },
  });

  if (normalizedSpaceId) {
    await prisma.space.update({
      where: { id: normalizedSpaceId },
      data: { lastActiveAt: new Date() },
    });
  }

  const mentionSource = [titleResult.value, bodyResult.value].filter(Boolean).join("\n");
  if (mentionSource) {
    await createMentionNotifications({
      actorId: user.id,
      actorName: user.name || "Someone",
      text: mentionSource,
      postId: post.id,
      contextLabel: "a post",
    });
  }

  if (mentionSource) {
    await autoFlagContent({
      authorId: user.id,
      targetType: "post",
      targetId: post.id,
      text: mentionSource,
    });
  }

  return Response.json(post, { status: 201 });
}
