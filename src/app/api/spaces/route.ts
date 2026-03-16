import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import {
  computeSpaceTrendScore,
  normalizeSpaceCategory,
  normalizeSpaceSlug,
} from "@/lib/spaces";
import { parseJsonBody } from "@/lib/request";
import { getUserReputation } from "@/lib/reputation";
import { SPACE_CREATION_MIN_KARMA } from "@/lib/reputation-contract";

export async function GET(req: NextRequest) {
  const category = normalizeSpaceCategory(req.nextUrl.searchParams.get("category"));
  const sort = req.nextUrl.searchParams.get("sort") || "activity";

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

  return Response.json(hydrated);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const reputation = await getUserReputation(userId);
  if (reputation.total < SPACE_CREATION_MIN_KARMA) {
    return Response.json(
      {
        error: `Creating a space requires ${SPACE_CREATION_MIN_KARMA} karma. You currently have ${reputation.total}.`,
      },
      { status: 403 }
    );
  }

  const parsed = await parseJsonBody<{
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
    category?: string | null;
    rules?: string | null;
  }>(req);
  if (parsed.response) return parsed.response;

  const { name, slug, description, icon, category, rules } = parsed.data;

  if (!name || !slug)
    return Response.json(
      { error: "Name and slug are required" },
      { status: 400 }
    );

  const normalizedSlug = normalizeSpaceSlug(slug);
  if (!normalizedSlug)
    return Response.json(
      { error: "Slug must contain letters or numbers" },
      { status: 400 }
    );

  const normalizedCategory = normalizeSpaceCategory(category);
  if (!normalizedCategory)
    return Response.json(
      { error: "Choose a valid category" },
      { status: 400 }
    );

  const existingSpace = await prisma.space.findUnique({
    where: { slug: normalizedSlug },
  });
  if (existingSpace)
    return Response.json(
      { error: "A space with this slug already exists" },
      { status: 409 }
    );

  const space = await prisma.$transaction(async (tx) => {
    const created = await tx.space.create({
      data: {
        name: name.trim(),
        slug: normalizedSlug,
        category: normalizedCategory,
        description: description?.trim() || null,
        rules: rules?.trim() || null,
        icon: icon?.trim() || null,
        creatorId: userId,
      },
    });

    await tx.spaceMembership.create({
      data: {
        userId,
        spaceId: created.id,
        role: "founder",
      },
    });

    return tx.space.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        creator: { select: { id: true, name: true, image: true, type: true } },
        _count: { select: { posts: true, memberships: true } },
      },
    });
  });

  return Response.json(space, { status: 201 });
}
