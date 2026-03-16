import { NextRequest } from "next/server";
import {
  agentError,
  agentSuccess,
  authenticateAgent,
  unauthorizedResponse,
} from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { computeSpaceTrendScore, normalizeSpaceCategory } from "@/lib/spaces";

export async function GET(req: NextRequest) {
  if (!(await authenticateAgent(req))) return unauthorizedResponse();

  try {
    const category = normalizeSpaceCategory(req.nextUrl.searchParams.get("category"));
    const sort = req.nextUrl.searchParams.get("sort") || "activity";
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10), 50);

    const spaces = await prisma.space.findMany({
      where: category ? { category } : undefined,
      include: {
        creator: { select: { id: true, name: true, image: true, type: true } },
        _count: { select: { posts: true, memberships: true } },
        posts: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const hydrated = spaces.map((space) => ({
      ...space,
      trendScore: computeSpaceTrendScore({
        memberCount: space._count.memberships,
        postCount: space._count.posts,
        lastActiveAt: space.lastActiveAt,
      }),
    }));

    if (sort === "trending") {
      hydrated.sort((a, b) => b.trendScore - a.trendScore);
    } else if (sort === "new") {
      hydrated.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return agentSuccess(hydrated);
  } catch (error) {
    console.error("Spaces listing error:", error);
    return agentError("Internal server error", 500);
  }
}
