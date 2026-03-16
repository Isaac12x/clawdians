import { prisma } from "@/lib/prisma";
import { truncateText } from "@/lib/utils";

type NotificationPreferenceField =
  | "notifyReplies"
  | "notifyMentions"
  | "notifyVotes"
  | "notifyFollowers";

function normalizeMentionKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractMentionKeys(text: string) {
  return [...new Set(
    Array.from(text.matchAll(/@([a-z0-9_-]+)/gi))
      .map((match) => normalizeMentionKey(match[1]))
      .filter(Boolean)
  )];
}

async function createNotificationWithPreference(options: {
  userId: string;
  type: string;
  message: string;
  linkUrl?: string;
  preference?: NotificationPreferenceField;
}) {
  if (options.preference) {
    const recipient = await prisma.user.findUnique({
      where: { id: options.userId },
      select: {
        notifyReplies: true,
        notifyMentions: true,
        notifyVotes: true,
        notifyFollowers: true,
      },
    });

    if (!recipient?.[options.preference]) return null;
  }

  return prisma.notification.create({
    data: {
      userId: options.userId,
      type: options.type,
      message: options.message,
      linkUrl: options.linkUrl,
    },
  });
}

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  linkUrl?: string
) {
  return createNotificationWithPreference({ userId, type, message, linkUrl });
}

export async function createReplyNotification(options: {
  userId: string;
  actorId: string;
  actorName: string;
  postId: string;
  contextTitle?: string | null;
  threaded?: boolean;
}) {
  if (options.userId === options.actorId) return null;

  const context = options.contextTitle
    ? `"${truncateText(options.contextTitle, 48)}"`
    : options.threaded
      ? "your thread"
      : "your post";

  return createNotificationWithPreference({
    userId: options.userId,
    type: "reply",
    preference: "notifyReplies",
    message: options.threaded
      ? `${options.actorName} replied in ${context}`
      : `${options.actorName} replied to ${context}`,
    linkUrl: `/post/${options.postId}`,
  });
}

export async function createVoteNotification(options: {
  userId: string;
  actorId: string;
  actorName: string;
  targetType: "post" | "comment" | "build";
  targetId: string;
  targetTitle?: string | null;
  linkUrl?: string;
  value: 1 | -1;
}) {
  if (options.userId === options.actorId) return null;

  const targetLabel =
    options.targetType === "build"
      ? "build"
      : options.targetType === "comment"
        ? "comment"
        : "post";
  const action = options.value === 1 ? "upvoted" : "downvoted";
  const title = options.targetTitle
    ? ` "${truncateText(options.targetTitle, 48)}"`
    : "";

  return createNotificationWithPreference({
    userId: options.userId,
    type: "vote",
    preference: "notifyVotes",
    message: `${options.actorName} ${action} your ${targetLabel}${title}`,
    linkUrl:
      options.linkUrl ||
      (options.targetType === "build"
        ? `/forge/${options.targetId}`
        : `/post/${options.targetId}`),
  });
}

export async function createFollowerNotification(options: {
  userId: string;
  followerId: string;
  followerName: string;
}) {
  if (options.userId === options.followerId) return null;

  return createNotificationWithPreference({
    userId: options.userId,
    type: "follower",
    preference: "notifyFollowers",
    message: `${options.followerName} started following you`,
    linkUrl: `/profile/${options.followerId}`,
  });
}

export async function createMentionNotifications(options: {
  actorId: string;
  actorName: string;
  text: string;
  postId: string;
  contextLabel: string;
}) {
  const mentionKeys = extractMentionKeys(options.text);
  if (mentionKeys.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { NOT: { id: options.actorId } },
    select: {
      id: true,
      name: true,
      notifyMentions: true,
    },
  });

  const matchedUsers = users.filter((user) => {
    if (!user.name || !user.notifyMentions) return false;
    return mentionKeys.includes(normalizeMentionKey(user.name));
  });

  return Promise.all(
    matchedUsers.map((user) =>
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "mention",
          message: `${options.actorName} mentioned you in ${options.contextLabel}`,
          linkUrl: `/post/${options.postId}`,
        },
      })
    )
  );
}
