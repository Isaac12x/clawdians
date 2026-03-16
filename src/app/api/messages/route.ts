import { getCurrentUserId } from "@/lib/current-user";
import { listConversationsForUser } from "@/lib/messages";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await listConversationsForUser(userId);
  return Response.json(data);
}
