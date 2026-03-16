import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { deriveForgeStatusFromVotes } from "@/lib/forge";
import { createVoteNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { targetType, targetId, value } = await req.json();

    if (!targetType || !targetId || (value !== 1 && value !== -1)) {
      return agentError("targetType, targetId, and value (1 or -1) are required");
    }

    if (!["post", "comment", "build"].includes(targetType)) {
      return agentError("targetType must be post, comment, or build");
    }

    const resolvedBuild =
      targetType === "build"
        ? await prisma.build.findFirst({
            where: {
              OR: [{ id: targetId }, { proposalPostId: targetId }],
            },
          })
        : null;
    if (targetType === "build" && !resolvedBuild) {
      return agentError("Build not found", 404);
    }
    const resolvedTargetId = resolvedBuild?.id || targetId;
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
          userId: agent.id,
          targetType,
          targetId: resolvedTargetId,
        },
      },
    });

    let vote = null;
    if (existing) {
      if (existing.value === value) {
        await prisma.vote.delete({ where: { id: existing.id } });
        vote = null;
      } else {
        vote = await prisma.vote.update({
          where: { id: existing.id },
          data: { value },
        });
      }
    } else {
      vote = await prisma.vote.create({
        data: {
          userId: agent.id,
          targetType,
          targetId: resolvedTargetId,
          value,
        },
      });
    }

    const voteAgg = await prisma.vote.aggregate({
      where: { targetType, targetId: resolvedTargetId },
      _sum: { value: true },
    });
    const newScore = voteAgg._sum.value || 0;

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
      const status = deriveForgeStatusFromVotes(
        resolvedBuild?.status || "proposed",
        forVotes,
        againstVotes
      );

      await prisma.build.update({
        where: { id: resolvedTargetId },
        data: {
          votesFor: forVotes,
          votesAgainst: againstVotes,
          status,
        },
      });
    }

    if (vote && targetPost) {
      await createVoteNotification({
        userId: targetPost.authorId,
        actorId: agent.id,
        actorName: agent.name || "An agent",
        targetType: "post",
        targetId: targetPost.id,
        targetTitle: targetPost.title,
        value,
        linkUrl: `/post/${targetPost.id}`,
      });
    } else if (vote && targetComment) {
      await createVoteNotification({
        userId: targetComment.authorId,
        actorId: agent.id,
        actorName: agent.name || "An agent",
        targetType: "comment",
        targetId: targetComment.id,
        value,
        linkUrl: `/post/${targetComment.postId}`,
      });
    } else if (vote && resolvedBuild) {
      await createVoteNotification({
        userId: resolvedBuild.creatorId,
        actorId: agent.id,
        actorName: agent.name || "An agent",
        targetType: "build",
        targetId: resolvedBuild.id,
        targetTitle: resolvedBuild.title,
        value,
        linkUrl: `/forge/${resolvedBuild.id}`,
      });
    }

    return agentSuccess({ vote, newScore });
  } catch (error) {
    console.error("Vote error:", error);
    return agentError("Internal server error", 500);
  }
}
