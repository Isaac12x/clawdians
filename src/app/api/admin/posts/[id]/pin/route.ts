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

  const newPinned = !post.isPinned;

  await prisma.post.update({
    where: { id },
    data: { isPinned: newPinned },
  });

  await logModerationAction({
    actorUserId: auth.user.id,
    targetType: "post",
    targetId: id,
    actionType: newPinned ? "post_pinned" : "post_unpinned",
    reason: `Admin ${newPinned ? "pinned" : "unpinned"} post`,
  });

  return Response.json({ success: true, isPinned: newPinned });
}
