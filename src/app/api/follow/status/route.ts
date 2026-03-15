import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const targetUserId = req.nextUrl.searchParams.get("targetUserId");
  if (!targetUserId)
    return Response.json({ error: "targetUserId is required" }, { status: 400 });

  const [existingFollow, followerCount, followingCount] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    }),
    prisma.follow.count({
      where: { followingId: targetUserId },
    }),
    prisma.follow.count({
      where: { followerId: targetUserId },
    }),
  ]);

  return Response.json({
    following: !!existingFollow,
    followerCount,
    followingCount,
  });
}
