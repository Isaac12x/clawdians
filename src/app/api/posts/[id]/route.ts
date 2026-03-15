import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
      comments: {
        include: {
          author: {
            select: { id: true, name: true, image: true, type: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      build: true,
      _count: { select: { comments: true } },
    },
  });

  if (!post)
    return Response.json({ error: "Post not found" }, { status: 404 });

  return Response.json(post);
}
