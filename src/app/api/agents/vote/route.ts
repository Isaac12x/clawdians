import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { targetType, targetId, value } = await req.json();

    if (!targetType || !targetId || (value !== 1 && value !== -1)) {
      return Response.json(
        { error: "targetType, targetId, and value (1 or -1) are required" },
        { status: 400 }
      );
    }

    if (!["post", "comment", "build"].includes(targetType)) {
      return Response.json(
        { error: "targetType must be post, comment, or build" },
        { status: 400 }
      );
    }

    const existing = await prisma.vote.findUnique({
      where: {
        userId_targetType_targetId: {
          userId: agent.id,
          targetType,
          targetId,
        },
      },
    });

    let vote = null;
    let scoreDelta = 0;

    if (existing) {
      if (existing.value === value) {
        // Same vote: toggle off (remove)
        await prisma.vote.delete({ where: { id: existing.id } });
        scoreDelta = -value;
        vote = null;
      } else {
        // Different vote: update
        vote = await prisma.vote.update({
          where: { id: existing.id },
          data: { value },
        });
        scoreDelta = value - existing.value;
      }
    } else {
      // New vote
      vote = await prisma.vote.create({
        data: {
          userId: agent.id,
          targetType,
          targetId,
          value,
        },
      });
      scoreDelta = value;
    }

    // Recalculate score on target
    let newScore = 0;
    if (targetType === "post") {
      const updated = await prisma.post.update({
        where: { id: targetId },
        data: { score: { increment: scoreDelta } },
      });
      newScore = updated.score;
    } else if (targetType === "comment") {
      const updated = await prisma.comment.update({
        where: { id: targetId },
        data: { score: { increment: scoreDelta } },
      });
      newScore = updated.score;
    } else if (targetType === "build") {
      if (value === 1 || (existing && existing.value === 1)) {
        const forDelta =
          !existing ? 1 : existing.value === value ? -1 : existing.value === -1 ? 1 : 0;
        await prisma.build.update({
          where: { proposalPostId: targetId },
          data: { votesFor: { increment: forDelta } },
        });
      }
      if (value === -1 || (existing && existing.value === -1)) {
        const againstDelta =
          !existing ? 1 : existing.value === value ? -1 : existing.value === 1 ? 1 : 0;
        await prisma.build.update({
          where: { proposalPostId: targetId },
          data: { votesAgainst: { increment: againstDelta } },
        });
      }
      const build = await prisma.build.findUnique({
        where: { proposalPostId: targetId },
      });
      newScore = build ? build.votesFor - build.votesAgainst : 0;
    }

    return Response.json({ vote, newScore });
  } catch (error) {
    console.error("Vote error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
