import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { deriveForgeStatusFromVotes } from "@/lib/forge";
import { createVoteNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const { targetType, targetId, value } = await req.json();
  const resolvedBuild =
    targetType === "build"
      ? await prisma.build.findFirst({
          where: {
            OR: [{ id: targetId }, { proposalPostId: targetId }],
          },
        })
      : null;
  if (targetType === "build" && !resolvedBuild)
    return Response.json({ error: "Build not found" }, { status: 404 });
  const resolvedTargetId = resolvedBuild?.id || targetId;

  if (!["post", "comment", "build"].includes(targetType))
    return Response.json({ error: "Invalid targetType" }, { status: 400 });
  if (value !== 1 && value !== -1)
    return Response.json({ error: "Value must be 1 or -1" }, { status: 400 });

  const targetPost =
    targetType === "post"
      ? await prisma.post.findUnique({
          where: { id: resolvedTargetId },
          select: { id: true, authorId: true, title: true },
        })
      : null;
  const targetComment =
    targetType === "comment"
      ? await prisma.comment.findUnique({
          where: { id: resolvedTargetId },
          select: { id: true, authorId: true, postId: true },
        })
      : null;

  const existing = await prisma.vote.findUnique({
    where: {
        userId_targetType_targetId: {
          userId: user.id,
          targetType,
          targetId: resolvedTargetId,
        },
      },
    });

  let vote: typeof existing | null = null;

  if (existing && existing.value === value) {
    // Toggle off: delete the vote
    await prisma.vote.delete({ where: { id: existing.id } });
    vote = null;
  } else if (existing) {
    // Change vote value
    vote = await prisma.vote.update({
      where: { id: existing.id },
      data: { value },
    });
  } else {
    // Create new vote
    vote = await prisma.vote.create({
      data: {
        userId: user.id,
        targetType,
        targetId: resolvedTargetId,
        value,
      },
    });
  }

  // Recalculate score from scratch
  const voteAgg = await prisma.vote.aggregate({
    where: { targetType, targetId: resolvedTargetId },
    _sum: { value: true },
  });
  const newScore = voteAgg._sum.value || 0;

  // Update the target's score field
  if (targetType === "post") {
    await prisma.post.update({
      where: { id: resolvedTargetId },
      data: { score: newScore },
    });
  } else if (targetType === "comment") {
    await prisma.comment.update({
      where: { id: resolvedTargetId },
      data: { score: newScore },
    });
  } else if (targetType === "build") {
    const forVotes = await prisma.vote.count({
      where: { targetType: "build", targetId: resolvedTargetId, value: 1 },
    });
    const againstVotes = await prisma.vote.count({
      where: { targetType: "build", targetId: resolvedTargetId, value: -1 },
    });
    const nextStatus = deriveForgeStatusFromVotes(
      resolvedBuild?.status || "proposed",
      forVotes,
      againstVotes
    );

    await prisma.build.update({
      where: { id: resolvedTargetId },
      data: {
        votesFor: forVotes,
        votesAgainst: againstVotes,
        status: nextStatus,
      },
    });
  }

  if (vote && targetPost) {
    await createVoteNotification({
      userId: targetPost.authorId,
      actorId: user.id,
      actorName: user.name || "Someone",
      targetType: "post",
      targetId: targetPost.id,
      targetTitle: targetPost.title,
      value,
      linkUrl: `/post/${targetPost.id}`,
    });
  } else if (vote && targetComment) {
    await createVoteNotification({
      userId: targetComment.authorId,
      actorId: user.id,
      actorName: user.name || "Someone",
      targetType: "comment",
      targetId: targetComment.id,
      value,
      linkUrl: `/post/${targetComment.postId}`,
    });
  } else if (vote && resolvedBuild) {
    await createVoteNotification({
      userId: resolvedBuild.creatorId,
      actorId: user.id,
      actorName: user.name || "Someone",
      targetType: "build",
      targetId: resolvedBuild.id,
      targetTitle: resolvedBuild.title,
      value,
      linkUrl: `/forge/${resolvedBuild.id}`,
    });
  }

  return Response.json({ vote, newScore });
}
