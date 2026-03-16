import { prisma } from "@/lib/prisma";
import type {
  MessageConversationSummary,
  MessageListItem,
  MessageParticipant,
  MessageThreadResponse,
  MessagesOverviewResponse,
} from "@/lib/message-contract";

const participantSelect = {
  id: true,
  name: true,
  image: true,
  type: true,
} as const;

function serializeParticipant(participant: MessageParticipant): MessageParticipant {
  return {
    id: participant.id,
    name: participant.name,
    image: participant.image,
    type: participant.type,
  };
}

function serializeMessage(message: {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}): MessageListItem {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    read: message.read,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function listConversationsForUser(
  userId: string
): Promise<MessagesOverviewResponse> {
  const [messages, unreadGroups] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        sender: { select: participantSelect },
        receiver: { select: participantSelect },
      },
    }),
    prisma.message.groupBy({
      by: ["senderId"],
      where: { receiverId: userId, read: false },
      _count: { _all: true },
    }),
  ]);

  const unreadMap = new Map(
    unreadGroups.map((group) => [group.senderId, group._count._all])
  );
  const conversations = new Map<string, MessageConversationSummary>();

  for (const message of messages) {
    const otherUser =
      message.senderId === userId ? message.receiver : message.sender;

    if (conversations.has(otherUser.id)) continue;

    conversations.set(otherUser.id, {
      user: serializeParticipant(otherUser),
      lastMessage: serializeMessage(message),
      unreadCount: unreadMap.get(otherUser.id) ?? 0,
    });
  }

  const summaries = [...conversations.values()];
  const totalUnreadCount = summaries.reduce(
    (sum, summary) => sum + summary.unreadCount,
    0
  );

  return {
    conversations: summaries,
    totalUnreadCount,
  };
}

export async function getConversationForUsers(
  userId: string,
  otherUserId: string
): Promise<MessageThreadResponse | null> {
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: participantSelect,
  });

  if (!otherUser) return null;

  const [messages, unreadCount] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.message.count({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
    }),
  ]);

  return {
    conversation: {
      user: serializeParticipant(otherUser),
    },
    messages: messages.map(serializeMessage),
    unreadCount,
  };
}

export async function markConversationRead(userId: string, otherUserId: string) {
  return prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: userId,
      read: false,
    },
    data: { read: true },
  });
}

export async function createMessage(options: {
  senderId: string;
  receiverId: string;
  content: string;
}) {
  const content = options.content.trim();
  if (!content) {
    throw new Error("Message content is required.");
  }

  if (content.length > 4000) {
    throw new Error("Message content must be 4000 characters or less.");
  }

  if (options.senderId === options.receiverId) {
    throw new Error("You cannot message yourself.");
  }

  const receiver = await prisma.user.findUnique({
    where: { id: options.receiverId },
    select: participantSelect,
  });

  if (!receiver) {
    throw new Error("Recipient not found.");
  }

  const message = await prisma.message.create({
    data: {
      senderId: options.senderId,
      receiverId: options.receiverId,
      content,
    },
  });

  return {
    message: serializeMessage(message),
    receiver: serializeParticipant(receiver),
  };
}

export async function listSuggestedMessageContacts(userId: string, limit = 18) {
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
    },
    select: {
      id: true,
      name: true,
      image: true,
      type: true,
      bio: true,
      _count: {
        select: {
          followers: true,
          posts: true,
          comments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return users
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      type: user.type,
      bio: user.bio,
      score:
        user._count.followers * 6 +
        user._count.posts * 3 +
        user._count.comments,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
