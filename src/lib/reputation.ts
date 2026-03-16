import { prisma } from "@/lib/prisma";
import {
  getKarmaLevel,
  type UserReputation,
} from "@/lib/reputation-contract";

const FORGE_STATUS_BONUS: Record<string, number> = {
  proposed: 2,
  under_review: 5,
  accepted: 10,
  building: 14,
  shipped: 22,
  rejected: 0,
};

function sumPositiveScores<T extends { score: number }>(records: T[]) {
  return records.reduce((sum, record) => sum + Math.max(0, record.score), 0);
}

function sumForgeKarma<T extends { votesFor: number; status: string }>(builds: T[]) {
  return builds.reduce(
    (sum, build) => sum + build.votesFor + (FORGE_STATUS_BONUS[build.status] ?? 0),
    0
  );
}

function buildReputation(options: {
  posts: Array<{ score: number }>;
  comments: Array<{ score: number }>;
  builds: Array<{ votesFor: number; status: string }>;
}): UserReputation {
  const postKarma = sumPositiveScores(options.posts);
  const commentKarma = sumPositiveScores(options.comments);
  const forgeKarma = sumForgeKarma(options.builds);
  const total = Math.max(0, postKarma + commentKarma + forgeKarma);

  return {
    postKarma,
    commentKarma,
    forgeKarma,
    total,
    level: getKarmaLevel(total),
  };
}

export async function getUserReputation(userId: string): Promise<UserReputation> {
  const [posts, comments, builds] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId },
      select: { score: true },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      select: { score: true },
    }),
    prisma.build.findMany({
      where: { creatorId: userId },
      select: { votesFor: true, status: true },
    }),
  ]);

  return buildReputation({ posts, comments, builds });
}

export async function hydrateUsersWithReputation<T extends { id: string }>(users: T[]) {
  if (users.length === 0) {
    return [] as Array<
      T & {
        reputation: UserReputation;
        karma: number;
      }
    >;
  }

  const userIds = users.map((user) => user.id);
  const [posts, comments, builds] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: { in: userIds } },
      select: { authorId: true, score: true },
    }),
    prisma.comment.findMany({
      where: { authorId: { in: userIds } },
      select: { authorId: true, score: true },
    }),
    prisma.build.findMany({
      where: { creatorId: { in: userIds } },
      select: { creatorId: true, votesFor: true, status: true },
    }),
  ]);

  const postsByUser = new Map<string, Array<{ score: number }>>();
  const commentsByUser = new Map<string, Array<{ score: number }>>();
  const buildsByUser = new Map<string, Array<{ votesFor: number; status: string }>>();

  for (const post of posts) {
    postsByUser.set(post.authorId, [...(postsByUser.get(post.authorId) || []), post]);
  }

  for (const comment of comments) {
    commentsByUser.set(comment.authorId, [
      ...(commentsByUser.get(comment.authorId) || []),
      comment,
    ]);
  }

  for (const build of builds) {
    buildsByUser.set(build.creatorId, [
      ...(buildsByUser.get(build.creatorId) || []),
      build,
    ]);
  }

  return users.map((user) => {
    const reputation = buildReputation({
      posts: postsByUser.get(user.id) || [],
      comments: commentsByUser.get(user.id) || [],
      builds: buildsByUser.get(user.id) || [],
    });

    return {
      ...user,
      reputation,
      karma: reputation.total,
    };
  });
}

export async function getContributorLeaderboard(options?: {
  limit?: number;
  type?: "all" | "human" | "agent";
}) {
  const limit = options?.limit ?? 25;
  const type = options?.type ?? "all";

  const users = await prisma.user.findMany({
    where: type === "all" ? undefined : { type },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      type: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          comments: true,
          builds: true,
          followers: true,
        },
      },
    },
  });

  return (await hydrateUsersWithReputation(users))
    .sort((left, right) => {
      if (right.karma !== left.karma) return right.karma - left.karma;
      if (right._count.followers !== left._count.followers) {
        return right._count.followers - left._count.followers;
      }
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, limit)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
}
