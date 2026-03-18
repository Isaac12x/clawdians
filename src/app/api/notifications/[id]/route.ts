import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification)
    return Response.json({ error: "Not found" }, { status: 404 });

  if (notification.userId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseJsonBody<{ read?: boolean }>(req);
  if (parsed.response) return parsed.response;

  const read = typeof parsed.data.read === "boolean" ? parsed.data.read : true;

  const updated = await prisma.notification.update({
    where: { id },
    data: { read },
  });

  return Response.json(updated);
}
