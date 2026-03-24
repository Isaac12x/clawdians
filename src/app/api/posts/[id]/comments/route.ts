import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import {
  createMentionNotifications,
  createReplyNotification,
} from "@/lib/notifications";
import { parseJsonBody } from "@/lib/request";
import { autoFlagContent } from "@/lib/moderation";
import { validateTextField, MAX_COMMENT_LENGTH } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const { id: postId } = await params;
  const parsed = await parseJsonBody<{
    body?: string;
    parentId?: string | null;
  }>(req);
  if (parsed.response) return parsed.response;

  const { body, parentId } = parsed.data;

  const bodyResult = validateTextField(body, "body", MAX_COMMENT_LENGTH, { required: true });
  if (bodyResult.error)
    return Response.json({ error: bodyResult.error }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post)
    return Response.json({ error: "Post not found" }, { status: 404 });
  if (post.isLocked)
    return Response.json({ error: "This post is locked. Comments are disabled." }, { status: 403 });

  const parentComment = parentId
    ? await prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      })
    : null;

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: user.id,
      parentId: parentId || null,
      body: bodyResult.value!,
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
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
      actorId: user.id,
      actorName: user.name || "Someone",
      postId,
      contextTitle: post.title,
      threaded: true,
    });
  } else {
    await createReplyNotification({
      userId: post.authorId,
      actorId: user.id,
      actorName: user.name || "Someone",
      postId,
      contextTitle: post.title,
      threaded: false,
    });
  }

  await createMentionNotifications({
    actorId: user.id,
    actorName: user.name || "Someone",
    text: bodyResult.value!,
    postId,
    contextLabel: "a comment",
  });

  await autoFlagContent({
    authorId: user.id,
    targetType: "comment",
    targetId: comment.id,
    text: bodyResult.value!,
  });

  return Response.json(comment, { status: 201 });
}
