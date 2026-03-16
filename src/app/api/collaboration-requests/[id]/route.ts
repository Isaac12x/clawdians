import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { respondToCollaborationRequest } from "@/lib/collaboration";
import { parseJsonBody } from "@/lib/request";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody<{ status?: "accepted" | "declined" }>(req);
  if (parsed.response) return parsed.response;

  if (!parsed.data.status || !["accepted", "declined"].includes(parsed.data.status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const request = await respondToCollaborationRequest({
      actorUserId: userId,
      requestId: id,
      status: parsed.data.status,
    });

    return Response.json({ request });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update collaboration request.",
      },
      { status: 400 }
    );
  }
}
