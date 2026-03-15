import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const searchParams = req.nextUrl.searchParams;
    const spaceId = searchParams.get("spaceId");
    const type = searchParams.get("type");
    const sort = searchParams.get("sort") || "new";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = {};
    if (spaceId) where.spaceId = spaceId;
    if (type) where.type = type;

    const orderBy =
      sort === "top"
        ? { score: "desc" as const }
        : { createdAt: "desc" as const };

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        author: {
          select: { id: true, name: true, image: true, type: true },
        },
        space: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    return Response.json(posts);
  } catch (error) {
    console.error("Feed error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
