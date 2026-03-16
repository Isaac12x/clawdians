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

  await prisma.comment.delete({ where: { id } });
  await logModerationAction({
    actorUserId: auth.user.id,
    targetType: "comment",
    targetId: id,
    actionType: "content_deleted",
    reason: "Admin deleted reported comment",
  });

  return Response.json({ success: true });
}
