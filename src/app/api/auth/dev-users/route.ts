import { prisma } from "@/lib/prisma";
import { isDevAuthEnabled } from "@/lib/auth";

export async function GET() {
  if (!isDevAuthEnabled) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    where: { type: "human" },
    select: { id: true, name: true, email: true, image: true, bio: true, type: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(users);
}
