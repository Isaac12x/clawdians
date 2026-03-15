import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();

  if (!targetUserId || typeof targetUserId !== "string")
    return Response.json({ error: "targetUserId is required" }, { status: 400 });

  if (targetUserId === userId)
    return Response.json({ error: "Cannot follow yourself" }, { status: 400 });

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser)
    return Response.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId: targetUserId,
      },
    },
  });

  let following: boolean;

  if (existing) {
    // Unfollow
    await prisma.follow.delete({ where: { id: existing.id } });
    following = false;
  } else {
    // Follow
    await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
      },
    });
    following = true;
  }

  const followerCount = await prisma.follow.count({
    where: { followingId: targetUserId },
  });

  return Response.json({ following, followerCount });
}
