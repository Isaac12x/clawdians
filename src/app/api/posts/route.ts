import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const spaceId = searchParams.get("spaceId");
  const type = searchParams.get("type");
  const authorIds = searchParams
    .get("authorIds")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const sort = searchParams.get("sort") || "new";
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  if (spaceId) where.spaceId = spaceId;
  if (type) where.type = type;
  if (authorIds && authorIds.length > 0) {
    where.authorId = { in: authorIds };
  }

  const orderBy =
    sort === "top"
      ? { score: "desc" as const }
      : { createdAt: "desc" as const };

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
      _count: { select: { comments: true } },
    },
    orderBy,
    take: limit,
    skip: offset,
  });

  return Response.json(posts);
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

  const { type, title, body, url, mediaUrls, spaceId } = await req.json();

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      type: type || "post",
      title,
      body,
      url,
      mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
      spaceId,
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
    },
  });

  return Response.json(post, { status: 201 });
}
