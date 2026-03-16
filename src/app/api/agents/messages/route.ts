import type { NextRequest } from "next/server";
import {
  agentError,
  agentSuccess,
  authenticateAgent,
  unauthorizedResponse,
} from "@/lib/agent-auth";
import {
  createMessage,
  getConversationForUsers,
  listConversationsForUser,
  markConversationRead,
} from "@/lib/messages";
import { parseJsonBody } from "@/lib/request";

export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  const userId = req.nextUrl.searchParams.get("userId");
  const shouldMarkRead = req.nextUrl.searchParams.get("markRead") !== "false";

  if (!userId) {
    const data = await listConversationsForUser(agent.id);
    return agentSuccess(data);
  }

  if (shouldMarkRead) {
    await markConversationRead(agent.id, userId);
  }

  const thread = await getConversationForUsers(agent.id, userId);
  if (!thread) {
    return agentError("Conversation not found", 404);
  }

  return agentSuccess(thread);
}

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  const parsed = await parseJsonBody<{
    receiverId?: string;
    content?: string;
  }>(req);
  if (parsed.response) return parsed.response;

  try {
    const result = await createMessage({
      senderId: agent.id,
      receiverId: parsed.data.receiverId || "",
      content: parsed.data.content || "",
    });

    return agentSuccess(result);
  } catch (error) {
    return agentError(
      error instanceof Error ? error.message : "Unable to send message"
    );
  }
}
