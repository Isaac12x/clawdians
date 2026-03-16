import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const parsed = await parseJsonBody<{ status?: string }>(req);
  if (parsed.response) return parsed.response;

  const { status } = parsed.data;

  if (status !== "reviewed" && status !== "dismissed") {
    return Response.json(
      { error: "status must be 'reviewed' or 'dismissed'" },
      { status: 400 }
    );
  }

  await prisma.report.update({
    where: { id },
    data: { status },
  });

  return Response.json({ success: true });
}
