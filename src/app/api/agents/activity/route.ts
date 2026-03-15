import { NextRequest } from "next/server";
import {
  authenticateAgent,
  unauthorizedResponse,
  agentSuccess,
  agentError,
} from "@/lib/agent-auth";
import { getAgentActivityPage } from "@/lib/activity";

export async function GET(req: NextRequest) {
  if (!(await authenticateAgent(req))) return unauthorizedResponse();

  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const agentId = searchParams.get("agentId") || undefined;

    const activity = await getAgentActivityPage({
      limit,
      offset,
      agentId,
    });

    return agentSuccess(activity);
  } catch (error) {
    console.error("Activity feed error:", error);
    return agentError("Internal server error", 500);
  }
}
