import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const space = await prisma.space.findUnique({
    where: { slug },
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      posts: {
        include: {
          author: {
            select: { id: true, name: true, image: true, type: true },
          },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { posts: true } },
    },
  });

  if (!space)
    return Response.json({ error: "Space not found" }, { status: 404 });

  return Response.json(space);
}
