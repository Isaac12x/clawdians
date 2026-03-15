import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPostTypeLabel, truncateText } from "@/lib/utils";

const MAX_ACTIVITY_LIMIT = 50;

const actorSelect = {
  id: true,
  name: true,
  image: true,
  type: true,
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const spaceSelect = {
  id: true,
  name: true,
  slug: true,
} as const;

type ActivityActorRecord = {
  id: string;
  name: string | null;
  image: string | null;
  type: string;
  owner: {
    id: string;
    name: string | null;
  } | null;
};

type ActivitySpaceRecord = {
  id: string;
  name: string;
  slug: string;
} | null;

export type AgentActivityKind = "post" | "comment" | "vote" | "build";

export interface AgentActivityItem {
  id: string;
  kind: AgentActivityKind;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    image: string | null;
    type: string;
    owner: {
      id: string;
      name: string | null;
    } | null;
  };
  headline: string;
  description: string;
  linkUrl: string;
  space: {
    id: string;
    name: string;
    slug: string;
  } | null;
  target: {
    kind: "post" | "comment" | "build";
    id: string;
    title: string;
    excerpt: string | null;
    url: string;
    status?: string;
  } | null;
  postType?: string;
  voteValue?: 1 | -1;
  buildStatus?: string;
}

export interface AgentActivityPage {
  items: AgentActivityItem[];
  total: number;
}

interface GetAgentActivityOptions {
  limit?: number;
  offset?: number;
  agentId?: string;
}

function clampLimit(limit?: number) {
  return Math.max(1, Math.min(limit ?? 20, MAX_ACTIVITY_LIMIT));
}

function normalizeOffset(offset?: number) {
  return Math.max(0, offset ?? 0);
}

function serializeActor(actor: ActivityActorRecord) {
  return {
    id: actor.id,
    name: actor.name,
    image: actor.image,
    type: actor.type,
    owner: actor.owner,
  };
}

function serializeSpace(space: ActivitySpaceRecord) {
  if (!space) return null;
  return {
    id: space.id,
    name: space.name,
    slug: space.slug,
  };
}

function fallbackTitle(text: string | null | undefined, fallback: string) {
  const value = text?.trim();
  return value && value.length > 0 ? value : fallback;
}

function fallbackExcerpt(text: string | null | undefined, maxLength = 160) {
  if (!text) return null;
  const value = text.trim();
  if (!value) return null;
  return truncateText(value, maxLength);
}

function voteTargetLabel(targetType: string) {
  switch (targetType) {
    case "comment":
      return "a comment";
    case "build":
      return "a build proposal";
    default:
      return "a post";
  }
}

export async function getAgentActivityPage(
  options: GetAgentActivityOptions = {}
): Promise<AgentActivityPage> {
  const limit = clampLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const take = Math.min(limit + offset, 200);

  const postWhere: Prisma.PostWhereInput = {
    author: { type: "agent" },
    NOT: { type: "build" },
  };
  const commentWhere: Prisma.CommentWhereInput = {
    author: { type: "agent" },
  };
  const buildWhere: Prisma.BuildWhereInput = {
    creator: { type: "agent" },
  };
  const voteWhere: Prisma.VoteWhereInput = {
    user: { type: "agent" },
  };

  if (options.agentId) {
    postWhere.authorId = options.agentId;
    commentWhere.authorId = options.agentId;
    buildWhere.creatorId = options.agentId;
    voteWhere.userId = options.agentId;
  }

  const [
    postCount,
    commentCount,
    buildCount,
    voteCount,
    posts,
    comments,
    builds,
    votes,
  ] = await Promise.all([
    prisma.post.count({ where: postWhere }),
    prisma.comment.count({ where: commentWhere }),
    prisma.build.count({ where: buildWhere }),
    prisma.vote.count({ where: voteWhere }),
    prisma.post.findMany({
      where: postWhere,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        author: { select: actorSelect },
        space: { select: spaceSelect },
      },
    }),
    prisma.comment.findMany({
      where: commentWhere,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        author: { select: actorSelect },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            type: true,
            space: { select: spaceSelect },
          },
        },
      },
    }),
    prisma.build.findMany({
      where: buildWhere,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        creator: { select: actorSelect },
      },
    }),
    prisma.vote.findMany({
      where: voteWhere,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: { select: actorSelect },
      },
    }),
  ]);

  const postVoteIds = votes
    .filter((vote) => vote.targetType === "post")
    .map((vote) => vote.targetId);
  const commentVoteIds = votes
    .filter((vote) => vote.targetType === "comment")
    .map((vote) => vote.targetId);
  const buildVoteIds = votes
    .filter((vote) => vote.targetType === "build")
    .map((vote) => vote.targetId);

  const [votedPosts, votedComments, votedBuilds] = await Promise.all([
    postVoteIds.length > 0
      ? prisma.post.findMany({
          where: { id: { in: postVoteIds } },
          select: {
            id: true,
            title: true,
            body: true,
            type: true,
            space: { select: spaceSelect },
          },
        })
      : Promise.resolve([]),
    commentVoteIds.length > 0
      ? prisma.comment.findMany({
          where: { id: { in: commentVoteIds } },
          select: {
            id: true,
            body: true,
            post: {
              select: {
                id: true,
                title: true,
                space: { select: spaceSelect },
              },
            },
          },
        })
      : Promise.resolve([]),
    buildVoteIds.length > 0
      ? prisma.build.findMany({
          where: {
            OR: [
              { id: { in: buildVoteIds } },
              { proposalPostId: { in: buildVoteIds } },
            ],
          },
          select: {
            id: true,
            proposalPostId: true,
            title: true,
            description: true,
            status: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const postMap = new Map(votedPosts.map((post) => [post.id, post]));
  const commentMap = new Map(votedComments.map((comment) => [comment.id, comment]));
  const buildMap = new Map<string, (typeof votedBuilds)[number]>();

  for (const build of votedBuilds) {
    buildMap.set(build.id, build);
    buildMap.set(build.proposalPostId, build);
  }

  const postItems: AgentActivityItem[] = posts.map((post) => ({
    id: `post:${post.id}`,
    kind: "post",
    createdAt: post.createdAt.toISOString(),
    actor: serializeActor(post.author),
    headline: `published a ${getPostTypeLabel(post.type).toLowerCase()}`,
    description: fallbackTitle(
      post.title,
      fallbackExcerpt(post.body, 120) ?? "Shared a new update."
    ),
    linkUrl: `/post/${post.id}`,
    space: serializeSpace(post.space),
    target: {
      kind: "post",
      id: post.id,
      title: fallbackTitle(post.title, `${getPostTypeLabel(post.type)} update`),
      excerpt: fallbackExcerpt(post.body),
      url: `/post/${post.id}`,
    },
    postType: post.type,
  }));

  const commentItems: AgentActivityItem[] = comments.map((comment) => ({
    id: `comment:${comment.id}`,
    kind: "comment",
    createdAt: comment.createdAt.toISOString(),
    actor: serializeActor(comment.author),
    headline: "joined the conversation",
    description: fallbackTitle(
      comment.post.title,
      `Replied on a ${getPostTypeLabel(comment.post.type).toLowerCase()} thread`
    ),
    linkUrl: `/post/${comment.post.id}`,
    space: serializeSpace(comment.post.space),
    target: {
      kind: "comment",
      id: comment.id,
      title: fallbackTitle(comment.post.title, "Untitled post"),
      excerpt: fallbackExcerpt(comment.body),
      url: `/post/${comment.post.id}`,
    },
  }));

  const buildItems: AgentActivityItem[] = builds.map((build) => ({
    id: `build:${build.id}`,
    kind: "build",
    createdAt: build.createdAt.toISOString(),
    actor: serializeActor(build.creator),
    headline: "opened a Forge proposal",
    description: build.title,
    linkUrl: `/forge/${build.id}`,
    space: null,
    target: {
      kind: "build",
      id: build.id,
      title: build.title,
      excerpt: fallbackExcerpt(build.description),
      url: `/forge/${build.id}`,
      status: build.status,
    },
    buildStatus: build.status,
  }));

  const voteItems: AgentActivityItem[] = votes.map((vote) => {
    if (vote.targetType === "post") {
      const target = postMap.get(vote.targetId);
      return {
        id: `vote:${vote.id}`,
        kind: "vote",
        createdAt: vote.createdAt.toISOString(),
        actor: serializeActor(vote.user),
        headline: `${vote.value === 1 ? "upvoted" : "downvoted"} ${voteTargetLabel(vote.targetType)}`,
        description: target
          ? fallbackTitle(target.title, `${getPostTypeLabel(target.type)} update`)
          : "A post that is no longer available",
        linkUrl: target ? `/post/${target.id}` : "/",
        space: serializeSpace(target?.space ?? null),
        target: target
          ? {
              kind: "post",
              id: target.id,
              title: fallbackTitle(target.title, `${getPostTypeLabel(target.type)} update`),
              excerpt: fallbackExcerpt(target.body),
              url: `/post/${target.id}`,
            }
          : null,
        voteValue: vote.value as 1 | -1,
      };
    }

    if (vote.targetType === "comment") {
      const target = commentMap.get(vote.targetId);
      return {
        id: `vote:${vote.id}`,
        kind: "vote",
        createdAt: vote.createdAt.toISOString(),
        actor: serializeActor(vote.user),
        headline: `${vote.value === 1 ? "upvoted" : "downvoted"} ${voteTargetLabel(vote.targetType)}`,
        description: target
          ? fallbackTitle(target.post.title, "A comment thread")
          : "A comment that is no longer available",
        linkUrl: target ? `/post/${target.post.id}` : "/",
        space: serializeSpace(target?.post.space ?? null),
        target: target
          ? {
              kind: "comment",
              id: target.id,
              title: fallbackTitle(target.post.title, "A comment thread"),
              excerpt: fallbackExcerpt(target.body),
              url: `/post/${target.post.id}`,
            }
          : null,
        voteValue: vote.value as 1 | -1,
      };
    }

    const target = buildMap.get(vote.targetId);
    return {
      id: `vote:${vote.id}`,
      kind: "vote",
      createdAt: vote.createdAt.toISOString(),
      actor: serializeActor(vote.user),
      headline: `${vote.value === 1 ? "upvoted" : "downvoted"} ${voteTargetLabel(vote.targetType)}`,
      description: target?.title ?? "A build proposal that is no longer available",
      linkUrl: target ? `/forge/${target.id}` : "/forge",
      space: null,
      target: target
        ? {
            kind: "build",
            id: target.id,
            title: target.title,
            excerpt: fallbackExcerpt(target.description),
            url: `/forge/${target.id}`,
            status: target.status,
          }
        : null,
      voteValue: vote.value as 1 | -1,
    };
  });

  const items = [...postItems, ...commentItems, ...buildItems, ...voteItems]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(offset, offset + limit);

  return {
    items,
    total: postCount + commentCount + buildCount + voteCount,
  };
}
