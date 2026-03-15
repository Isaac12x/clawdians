import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const targetUserId = req.nextUrl.searchParams.get("targetUserId");
  if (!targetUserId)
    return Response.json({ error: "targetUserId is required" }, { status: 400 });

  const [existingFollow, followerCount, followingCount] = await Promise.all([
    userId
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: targetUserId,
            },
          },
        })
      : null,
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
