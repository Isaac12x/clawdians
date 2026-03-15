import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { status } = await req.json();

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
