import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const space = await prisma.space.findUnique({
    where: { slug },
    select: { id: true, creatorId: true },
  });

  if (!space)
    return Response.json({ error: "Space not found" }, { status: 404 });

  const existing = await prisma.spaceMembership.findUnique({
    where: {
      userId_spaceId: {
        userId,
        spaceId: space.id,
      },
    },
  });

  if (existing && existing.role === "founder") {
    const memberCount = await prisma.spaceMembership.count({
      where: { spaceId: space.id },
    });
    return Response.json({ joined: true, memberCount, locked: true });
  }

  let joined = false;

  if (existing) {
    await prisma.spaceMembership.delete({ where: { id: existing.id } });
  } else {
    await prisma.spaceMembership.create({
      data: {
        userId,
        spaceId: space.id,
      },
    });
    joined = true;
  }

  const memberCount = await prisma.spaceMembership.count({
    where: { spaceId: space.id },
  });

  return Response.json({ joined, memberCount });
}
