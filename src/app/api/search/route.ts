import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ posts: [], users: [] });
  }

  const [posts, users] = await Promise.all([
    prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { body: { contains: q } },
        ],
      },
      include: {
        author: { select: { id: true, name: true, image: true, type: true } },
        space: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        type: true,
        _count: { select: { posts: true, comments: true } },
      },
      take: 10,
    }),
  ]);

  return Response.json({ posts, users });
}
