import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { resolveAgentCapabilities } from "@/lib/utils";

const collaborationAgentSelect = {
  id: true,
  name: true,
  image: true,
  bio: true,
  type: true,
  capabilities: true,
  ownerId: true,
  owner: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

async function getActorContext(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      type: true,
      name: true,
      agents: {
        select: {
          id: true,
          name: true,
          type: true,
          capabilities: true,
          bio: true,
        },
      },
    },
  });
}

export async function getAccessibleSenderAgents(userId: string) {
  const actor = await getActorContext(userId);
  if (!actor) return [];

  if (actor.type === "agent") {
    const self = await prisma.user.findUnique({
      where: { id: userId },
      select: collaborationAgentSelect,
    });

    if (!self) return [];

    return [
      {
        ...self,
        capabilities: resolveAgentCapabilities({
          capabilities: self.capabilities,
          bio: self.bio,
        }),
      },
    ];
  }

  return actor.agents.map((agent) => ({
    ...agent,
    capabilities: resolveAgentCapabilities({
      capabilities: agent.capabilities,
      bio: agent.bio,
    }),
  }));
}

export async function listCollaborationRequests(userId: string) {
  const senderAgents = await getAccessibleSenderAgents(userId);
  const agentIds = senderAgents.map((agent) => agent.id);
  if (agentIds.length === 0) return [];

  const requests = await prisma.collaborationRequest.findMany({
    where: {
      OR: [{ senderId: { in: agentIds } }, { receiverId: { in: agentIds } }],
    },
    include: {
      sender: { select: collaborationAgentSelect },
      receiver: { select: collaborationAgentSelect },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return requests.map((request) => ({
    id: request.id,
    status: request.status,
    message: request.message,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    direction: agentIds.includes(request.receiverId) ? "incoming" : "outgoing",
    sender: {
      id: request.sender.id,
      name: request.sender.name,
      image: request.sender.image,
      owner: request.sender.owner,
      capabilities: resolveAgentCapabilities({
        capabilities: request.sender.capabilities,
        bio: request.sender.bio,
      }),
    },
    receiver: {
      id: request.receiver.id,
      name: request.receiver.name,
      image: request.receiver.image,
      owner: request.receiver.owner,
      capabilities: resolveAgentCapabilities({
        capabilities: request.receiver.capabilities,
        bio: request.receiver.bio,
      }),
    },
  }));
}

export async function createCollaborationRequest(options: {
  actorUserId: string;
  senderAgentId: string;
  receiverAgentId: string;
  message: string;
}) {
  const actor = await getActorContext(options.actorUserId);
  if (!actor) throw new Error("User not found.");

  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({
      where: { id: options.senderAgentId },
      select: collaborationAgentSelect,
    }),
    prisma.user.findUnique({
      where: { id: options.receiverAgentId },
      select: collaborationAgentSelect,
    }),
  ]);

  if (!sender || sender.type !== "agent") {
    throw new Error("Sender agent not found.");
  }

  if (!receiver || receiver.type !== "agent") {
    throw new Error("Receiver agent not found.");
  }

  if (sender.id === receiver.id) {
    throw new Error("Agents cannot collaborate with themselves.");
  }

  const actorCanUseSender =
    actor.type === "agent"
      ? sender.id === actor.id
      : sender.ownerId === actor.id;

  if (!actorCanUseSender) {
    throw new Error("You are not allowed to send from this agent.");
  }

  const message = options.message.trim();
  if (!message) {
    throw new Error("A collaboration brief is required.");
  }

  const existing = await prisma.collaborationRequest.findFirst({
    where: {
      senderId: sender.id,
      receiverId: receiver.id,
      status: "pending",
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A pending request already exists for this agent pair.");
  }

  const request = await prisma.collaborationRequest.create({
    data: {
      senderId: sender.id,
      receiverId: receiver.id,
      message,
    },
    include: {
      sender: { select: collaborationAgentSelect },
      receiver: { select: collaborationAgentSelect },
    },
  });

  const receiverMessage = `${sender.name || "An agent"} requested collaboration with ${receiver.name || "your agent"}.`;
  await Promise.all([
    createNotification(
      receiver.id,
      "collaboration_request",
      receiverMessage,
      "/agents"
    ),
    receiver.ownerId
      ? createNotification(
          receiver.ownerId,
          "collaboration_request",
          receiverMessage,
          "/agents"
        )
      : null,
  ]);

  return request;
}

export async function respondToCollaborationRequest(options: {
  actorUserId: string;
  requestId: string;
  status: "accepted" | "declined";
}) {
  const actor = await getActorContext(options.actorUserId);
  if (!actor) throw new Error("User not found.");

  const request = await prisma.collaborationRequest.findUnique({
    where: { id: options.requestId },
    include: {
      sender: { select: collaborationAgentSelect },
      receiver: { select: collaborationAgentSelect },
    },
  });

  if (!request) {
    throw new Error("Collaboration request not found.");
  }

  if (request.status !== "pending") {
    throw new Error("This request has already been resolved.");
  }

  const actorCanRespond =
    actor.type === "agent"
      ? request.receiverId === actor.id
      : request.receiver.ownerId === actor.id;

  if (!actorCanRespond) {
    throw new Error("You are not allowed to respond to this request.");
  }

  const updated = await prisma.collaborationRequest.update({
    where: { id: request.id },
    data: { status: options.status },
    include: {
      sender: { select: collaborationAgentSelect },
      receiver: { select: collaborationAgentSelect },
    },
  });

  const resolutionVerb =
    options.status === "accepted" ? "accepted" : "declined";
  const resolutionMessage = `${request.receiver.name || "An agent"} ${resolutionVerb} a collaboration request from ${request.sender.name || "your agent"}.`;

  await Promise.all([
    createNotification(
      request.sender.id,
      "collaboration_request",
      resolutionMessage,
      "/agents"
    ),
    request.sender.ownerId
      ? createNotification(
          request.sender.ownerId,
          "collaboration_request",
          resolutionMessage,
          "/agents"
        )
      : null,
  ]);

  return updated;
}
