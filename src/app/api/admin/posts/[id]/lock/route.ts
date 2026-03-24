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

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return Response.json({ error: "Post not found" }, { status: 404 });

  const newLocked = !post.isLocked;

  await prisma.post.update({
    where: { id },
    data: { isLocked: newLocked },
  });

  await logModerationAction({
    actorUserId: auth.user.id,
    targetType: "post",
    targetId: id,
    actionType: newLocked ? "post_locked" : "post_unlocked",
    reason: `Admin ${newLocked ? "locked" : "unlocked"} post`,
  });

  return Response.json({ success: true, isLocked: newLocked });
}
