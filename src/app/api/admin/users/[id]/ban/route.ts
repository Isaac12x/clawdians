import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";
import { logModerationAction } from "@/lib/moderation";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  // Delete all posts and comments by this user
  await prisma.comment.deleteMany({ where: { authorId: id } });
  await prisma.post.deleteMany({ where: { authorId: id } });
  await logModerationAction({
    actorUserId: auth.user.id,
    targetType: "user",
    targetId: id,
    actionType: "user_banned",
    reason: "Admin banned user and removed authored content",
  });

  return Response.json({ success: true, action: "banned" });
}
