import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type SearchType = "all" | "post" | "comment" | "user" | "space";

function parseSince(filter: string | null) {
  const now = Date.now();

  switch (filter) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function getTerms(query: string) {
  return query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const type = (req.nextUrl.searchParams.get("type") || "all") as SearchType;
  const date = req.nextUrl.searchParams.get("date");
  const space = req.nextUrl.searchParams.get("space")?.trim() || "";
  const author = req.nextUrl.searchParams.get("author")?.trim() || "";
  const since = parseSince(date);

  if (q.length < 2) {
    return Response.json({
      posts: [],
      comments: [],
      users: [],
      spaces: [],
      meta: { total: 0 },
    });
  }

  const terms = getTerms(q);
  const postTermFilters = terms.map((term) => ({
    OR: [{ title: { contains: term } }, { body: { contains: term } }],
  }));
  const commentTermFilters = terms.map((term) => ({
    body: { contains: term },
  }));
  const userTermFilters = terms.map((term) => ({
    OR: [{ name: { contains: term } }, { bio: { contains: term } }],
  }));
  const spaceTermFilters = terms.map((term) => ({
    OR: [
      { name: { contains: term } },
      { description: { contains: term } },
      { rules: { contains: term } },
    ],
  }));

  const [posts, comments, users, spaces] = await Promise.all([
    type === "all" || type === "post"
      ? prisma.post.findMany({
          where: {
            AND: [
              ...postTermFilters,
              ...(since ? [{ createdAt: { gte: since } }] : []),
              ...(space
                ? [
                    {
                      space: {
                        is: {
                          OR: [
                            { name: { contains: space } },
                            { slug: { contains: space } },
                          ],
                        },
                      },
                    },
                  ]
                : []),
              ...(author
                ? [{ author: { is: { name: { contains: author } } } }]
                : []),
            ],
          },
          include: {
            author: { select: { id: true, name: true, image: true, type: true } },
            space: { select: { id: true, name: true, slug: true } },
            _count: { select: { comments: true } },
          },
          orderBy: [{ score: "desc" }, { createdAt: "desc" }],
          take: 12,
        })
      : Promise.resolve([]),
    type === "all" || type === "comment"
      ? prisma.comment.findMany({
          where: {
            AND: [
              ...commentTermFilters,
              ...(since ? [{ createdAt: { gte: since } }] : []),
              ...(author
                ? [{ author: { is: { name: { contains: author } } } }]
                : []),
              ...(space
                ? [
                    {
                      post: {
                        is: {
                          space: {
                            is: {
                              OR: [
                                { name: { contains: space } },
                                { slug: { contains: space } },
                              ],
                            },
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
          include: {
            author: { select: { id: true, name: true, image: true, type: true } },
            post: {
              select: {
                id: true,
                title: true,
                space: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
    type === "all" || type === "user"
      ? prisma.user.findMany({
          where: {
            AND: [
              ...userTermFilters,
              ...(since ? [{ createdAt: { gte: since } }] : []),
              ...(author ? [{ name: { contains: author } }] : []),
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
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    type === "all" || type === "space"
      ? prisma.space.findMany({
          where: {
            AND: [
              ...spaceTermFilters,
              ...(since ? [{ createdAt: { gte: since } }] : []),
              ...(space
                ? [
                    {
                      OR: [
                        { name: { contains: space } },
                        { slug: { contains: space } },
                      ],
                    },
                  ]
                : []),
              ...(author
                ? [{ creator: { is: { name: { contains: author } } } }]
                : []),
            ],
          },
          include: {
            _count: { select: { memberships: true, posts: true } },
          },
          orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return Response.json({
    posts,
    comments,
    users,
    spaces,
    meta: {
      total: posts.length + comments.length + users.length + spaces.length,
    },
  });
}
