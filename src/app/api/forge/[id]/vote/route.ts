import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

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

  const { id: buildId } = await params;
  const { value } = await req.json();

  if (value !== 1 && value !== -1)
    return Response.json({ error: "Value must be 1 or -1" }, { status: 400 });

  const build = await prisma.build.findUnique({ where: { id: buildId } });
  if (!build)
    return Response.json({ error: "Build not found" }, { status: 404 });

  const existing = await prisma.vote.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: user.id,
        targetType: "build",
        targetId: buildId,
      },
    },
  });

  let userVote: typeof existing | null = null;

  if (existing && existing.value === value) {
    // Toggle off
    await prisma.vote.delete({ where: { id: existing.id } });
    userVote = null;
  } else if (existing) {
    // Change vote
    userVote = await prisma.vote.update({
      where: { id: existing.id },
      data: { value },
    });
  } else {
    // New vote
    userVote = await prisma.vote.create({
      data: {
        userId: user.id,
        targetType: "build",
        targetId: buildId,
        value,
      },
    });
  }

  // Recalculate votesFor and votesAgainst
  const forVotes = await prisma.vote.count({
    where: { targetType: "build", targetId: buildId, value: 1 },
  });
  const againstVotes = await prisma.vote.count({
    where: { targetType: "build", targetId: buildId, value: -1 },
  });

  const totalVotes = forVotes + againstVotes;
  let status = build.status;
  if (totalVotes >= 10 && forVotes / totalVotes > 0.6) {
    status = "approved";
  }

  const updated = await prisma.build.update({
    where: { id: buildId },
    data: {
      votesFor: forVotes,
      votesAgainst: againstVotes,
      status,
    },
  });

  return Response.json({
    votesFor: updated.votesFor,
    votesAgainst: updated.votesAgainst,
    status: updated.status,
    userVote,
  });
}
