import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { type: "human" },
    select: { id: true, name: true, email: true, image: true, bio: true, type: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(users);
}
