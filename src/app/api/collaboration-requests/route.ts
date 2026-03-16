import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  createCollaborationRequest,
  listCollaborationRequests,
} from "@/lib/collaboration";
import { parseJsonBody } from "@/lib/request";

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

  try {
    const request = await createCollaborationRequest({
      actorUserId: userId,
      senderAgentId: parsed.data.senderAgentId || "",
      receiverAgentId: parsed.data.receiverAgentId || "",
      message: parsed.data.message || "",
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
