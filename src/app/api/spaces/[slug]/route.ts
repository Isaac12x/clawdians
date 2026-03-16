import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

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
      memberships: {
        where: { userId: userId || "__none__" },
        select: { id: true },
      },
      _count: { select: { posts: true, memberships: true } },
    },
  });

  if (!space)
    return Response.json({ error: "Space not found" }, { status: 404 });

  return Response.json({
    ...space,
    viewerIsMember: space.memberships.length > 0,
  });
}
