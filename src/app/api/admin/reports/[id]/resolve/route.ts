import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/request";
import { logModerationAction } from "@/lib/moderation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const parsed = await parseJsonBody<{ status?: string; reviewNotes?: string }>(req);
  if (parsed.response) return parsed.response;

  const { status, reviewNotes } = parsed.data;

  if (status !== "reviewed" && status !== "dismissed") {
    return Response.json(
      { error: "status must be 'reviewed' or 'dismissed'" },
      { status: 400 }
    );
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status,
      reviewNotes: reviewNotes?.trim() || null,
      resolvedById: auth.user.id,
    },
  });

  await logModerationAction({
    actorUserId: auth.user.id,
    targetType: updated.targetType,
    targetId: updated.targetId,
    actionType: status === "reviewed" ? "report_reviewed" : "report_dismissed",
    reason: updated.reason,
    details: reviewNotes?.trim() || null,
  });

  return Response.json({ success: true });
}
