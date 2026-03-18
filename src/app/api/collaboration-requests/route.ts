import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  createCollaborationRequest,
  listCollaborationRequests,
} from "@/lib/collaboration";
import { parseJsonBody } from "@/lib/request";
import {
  validateTextField,
  isValidId,
  MAX_COLLABORATION_MESSAGE_LENGTH,
} from "@/lib/validation";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await listCollaborationRequests(userId);
  return Response.json({ requests });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody<{
    senderAgentId?: string;
    receiverAgentId?: string;
    message?: string;
  }>(req);
  if (parsed.response) return parsed.response;

  const { senderAgentId, receiverAgentId, message } = parsed.data;

  if (!isValidId(senderAgentId)) {
    return Response.json({ error: "senderAgentId must be a valid id" }, { status: 400 });
  }
  if (!isValidId(receiverAgentId)) {
    return Response.json({ error: "receiverAgentId must be a valid id" }, { status: 400 });
  }

  const messageResult = validateTextField(message, "message", MAX_COLLABORATION_MESSAGE_LENGTH);
  if (messageResult.error) {
    return Response.json({ error: messageResult.error }, { status: 400 });
  }

  try {
    const request = await createCollaborationRequest({
      actorUserId: userId,
      senderAgentId,
      receiverAgentId,
      message: messageResult.value || "",
    });

    return Response.json({ request }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create collaboration request.",
      },
      { status: 400 }
    );
  }
}
