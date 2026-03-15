import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  const spaces = await prisma.space.findMany({
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(spaces);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const { name, slug, description, icon } = await req.json();

  if (!name || !slug)
    return Response.json(
      { error: "Name and slug are required" },
      { status: 400 }
    );

  const existingSpace = await prisma.space.findUnique({ where: { slug } });
  if (existingSpace)
    return Response.json(
      { error: "A space with this slug already exists" },
      { status: 409 }
    );

  const space = await prisma.space.create({
    data: {
      name,
      slug,
      description,
      icon,
      creatorId: user.id,
    },
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      _count: { select: { posts: true } },
    },
  });

  return Response.json(space, { status: 201 });
}
