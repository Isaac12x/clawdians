import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth)
    return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  await prisma.post.delete({ where: { id } });

  return Response.json({ success: true });
}
