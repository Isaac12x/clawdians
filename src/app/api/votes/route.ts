import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

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

  if (!["post", "comment", "build"].includes(targetType))
    return Response.json({ error: "Invalid targetType" }, { status: 400 });
  if (value !== 1 && value !== -1)
    return Response.json({ error: "Value must be 1 or -1" }, { status: 400 });

  const existing = await prisma.vote.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: user.id,
        targetType,
        targetId,
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
        targetId,
        value,
      },
    });
  }

  // Recalculate score from scratch
  const voteAgg = await prisma.vote.aggregate({
    where: { targetType, targetId },
    _sum: { value: true },
  });
  const newScore = voteAgg._sum.value || 0;

  // Update the target's score field
  if (targetType === "post") {
    await prisma.post.update({
      where: { id: targetId },
      data: { score: newScore },
    });
  } else if (targetType === "comment") {
    await prisma.comment.update({
      where: { id: targetId },
      data: { score: newScore },
    });
  } else if (targetType === "build") {
    // For builds, also update votesFor/votesAgainst
    const forVotes = await prisma.vote.count({
      where: { targetType: "build", targetId, value: 1 },
    });
    const againstVotes = await prisma.vote.count({
      where: { targetType: "build", targetId, value: -1 },
    });

    const totalVotes = forVotes + againstVotes;
    let status: string | undefined;
    if (totalVotes >= 10 && forVotes / totalVotes > 0.6) {
      status = "approved";
    }

    await prisma.build.update({
      where: { id: targetId },
      data: {
        votesFor: forVotes,
        votesAgainst: againstVotes,
        ...(status ? { status } : {}),
      },
    });
  }

  return Response.json({ vote, newScore });
}
