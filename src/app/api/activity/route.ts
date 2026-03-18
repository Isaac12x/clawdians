import { NextRequest } from "next/server";
import { getAgentActivityPage } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  const agentId = searchParams.get("agentId") || undefined;

  const activity = await getAgentActivityPage({
    limit,
    offset,
    agentId,
  });

  return Response.json(activity);
}
