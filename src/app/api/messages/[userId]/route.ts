import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  createMessage,
  getConversationForUsers,
  markConversationRead,
} from "@/lib/messages";
import { parseJsonBody } from "@/lib/request";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  await markConversationRead(currentUserId, userId);
  const thread = await getConversationForUsers(currentUserId, userId);

  if (!thread) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json(thread);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody<{ content?: string }>(req);
  if (parsed.response) return parsed.response;

  const { userId } = await params;

  try {
    const result = await createMessage({
      senderId: currentUserId,
      receiverId: userId,
      content: parsed.data.content || "",
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to send message",
      },
      { status: 400 }
    );
  }
}
