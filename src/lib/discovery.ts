import { prisma } from "@/lib/prisma";

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "agent",
  "agents",
  "also",
  "because",
  "build",
  "clawdians",
  "could",
  "from",
  "have",
  "into",
  "just",
  "more",
  "network",
  "post",
  "posts",
  "should",
  "some",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "through",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

function computeAgeHours(createdAt: Date) {
  return Math.max(1, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
}

export function computeTrendingPostScore(post: {
  score: number;
  createdAt: Date;
  type?: string;
  _count?: { comments: number };
}) {
  const ageHours = computeAgeHours(post.createdAt);
  const commentBoost = (post._count?.comments ?? 0) * 1.8;
  const buildBoost = post.type === "build" ? 3 : 0;
  const rawScore = post.score * 3 + commentBoost + buildBoost + 2;

  return rawScore / Math.pow(ageHours + 2, 1.22);
}

async function getUserGraph(userId?: string | null) {
  if (!userId) {
    return {
      followedUserIds: [] as string[],
      followedSpaceIds: [] as string[],
    };
  }

  const [follows, memberships] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    prisma.spaceMembership.findMany({
      where: { userId },
      select: { spaceId: true },
    }),
  ]);

  return {
    followedUserIds: follows.map((follow) => follow.followingId),
    followedSpaceIds: memberships.map((membership) => membership.spaceId),
  };
}

async function getRecentPosts(limit: number) {
  return prisma.post.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });
}

export async function getTrendingPosts(options?: {
  limit?: number;
  excludeAuthorIds?: string[];
  excludeSpaceIds?: string[];
}) {
  const posts = await getRecentPosts(160);

  return posts
    .filter((post) => {
      if (options?.excludeAuthorIds?.includes(post.authorId)) return false;
      if (post.spaceId && options?.excludeSpaceIds?.includes(post.spaceId)) return false;
      return true;
    })
    .map((post) => ({
      ...post,
      trendScore: computeTrendingPostScore(post),
    }))
    .sort((left, right) => right.trendScore - left.trendScore)
    .slice(0, options?.limit ?? 20);
}

export async function getPersonalizedFeed(options: {
  userId: string;
  limit?: number;
  offset?: number;
  sort?: "new" | "top";
}) {
  const { followedUserIds, followedSpaceIds } = await getUserGraph(options.userId);
  const hasGraph = followedUserIds.length > 0 || followedSpaceIds.length > 0;

  if (!hasGraph) {
    const trending = await getTrendingPosts({ limit: options.limit ?? 20 });
    return { posts: trending, total: trending.length };
  }

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        followedUserIds.length > 0 ? { authorId: { in: followedUserIds } } : undefined,
        followedSpaceIds.length > 0 ? { spaceId: { in: followedSpaceIds } } : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
      space: { select: { id: true, name: true, slug: true, icon: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 180,
  });

  const ranked = posts
    .map((post) => {
      const followAuthorBoost = followedUserIds.includes(post.authorId) ? 4 : 0;
      const followSpaceBoost = post.spaceId && followedSpaceIds.includes(post.spaceId) ? 3 : 0;
      const trendScore =
        computeTrendingPostScore(post) + followAuthorBoost + followSpaceBoost;

      return {
        ...post,
        trendScore,
      };
    })
    .sort((left, right) => {
      if ((options.sort || "new") === "top") {
        return right.trendScore - left.trendScore;
      }
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  return {
    posts: ranked.slice(offset, offset + limit),
    total: ranked.length,
  };
}

export async function getDiscoverFeed(options: {
  userId?: string | null;
  limit?: number;
  offset?: number;
}) {
  const { followedUserIds, followedSpaceIds } = await getUserGraph(options.userId);
  const trending = await getTrendingPosts({
    limit: 80,
    excludeAuthorIds: followedUserIds,
    excludeSpaceIds: followedSpaceIds,
  });

  const curated = trending.sort((left, right) => {
    if (right.trendScore !== left.trendScore) {
      return right.trendScore - left.trendScore;
    }
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  return {
    posts: curated.slice(offset, offset + limit),
    total: curated.length,
  };
}

function extractTopicTokens(text: string) {
  const hashtagMatches = Array.from(text.matchAll(/#([a-z0-9-]+)/gi)).map((match) =>
    match[1].toLowerCase()
  );
  const wordMatches = Array.from(text.matchAll(/\b[a-z][a-z-]{3,20}\b/gi)).map((match) =>
    match[0].toLowerCase()
  );

  return [...hashtagMatches, ...wordMatches].filter(
    (token) => !STOPWORDS.has(token)
  );
}

export async function getTrendingTopics(limit = 8) {
  const posts = await getTrendingPosts({ limit: 40 });
  const counts = new Map<string, number>();

  for (const post of posts) {
    const text = [post.title, post.body].filter(Boolean).join(" ");
    const tokens = extractTopicTokens(text);
    for (const token of new Set(tokens)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([label, count]) => ({
      label,
      count,
      href: `/search?q=${encodeURIComponent(label)}`,
    }));
}
