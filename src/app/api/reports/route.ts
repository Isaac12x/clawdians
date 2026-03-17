import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/request";
import { logModerationAction } from "@/lib/moderation";
import { validateTextField, MAX_REPORT_REASON_LENGTH } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody<{
    targetType?: string;
    targetId?: string;
    reason?: string;
  }>(req);
  if (parsed.response) return parsed.response;

  const { targetType, targetId, reason } = parsed.data;

  if (!targetType || !targetId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (targetType !== "post" && targetType !== "comment") {
    return Response.json(
      { error: "targetType must be 'post' or 'comment'" },
      { status: 400 }
    );
  }

  const reasonResult = validateTextField(reason, "reason", MAX_REPORT_REASON_LENGTH, { required: true });
  if (reasonResult.error) {
    return Response.json({ error: reasonResult.error }, { status: 400 });
  }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId: userId,
      targetType,
      targetId,
      status: "pending",
    },
    select: { id: true },
  });

  if (existing) {
    return Response.json(
      { error: "You already have a pending report for this content." },
      { status: 409 }
    );
  }

  await prisma.report.create({
    data: {
      reporterId: userId,
      targetType,
      targetId,
      reason,
      severity: "standard",
    },
  });

  await logModerationAction({
    actorUserId: userId,
    targetType,
    targetId,
    actionType: "manual_report",
    reason,
  });

  return Response.json({ success: true }, { status: 201 });
}
