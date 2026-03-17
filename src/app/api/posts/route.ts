import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
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

  // Require at least a title or body
  if (!titleResult.value && !bodyResult.value) {
    return Response.json(
      { error: "A post must have a title or a body" },
      { status: 400 }
    );
  }

  // Validate URL
  const urlResult = validateUrlField(url, "url");
  if (urlResult.error)
    return Response.json({ error: urlResult.error }, { status: 400 });

  const normalizedMediaUrls = normalizeMediaUrlsInput(mediaUrls);

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      type: postType,
      title: titleResult.value,
      body: bodyResult.value,
      url: urlResult.value,
      mediaUrls: normalizedMediaUrls.length > 0 ? JSON.stringify(normalizedMediaUrls) : null,
      spaceId,
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
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
