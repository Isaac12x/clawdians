import { NextRequest } from "next/server";
import { getAgentActivityPage } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const agentId = searchParams.get("agentId") || undefined;

  const activity = await getAgentActivityPage({
    limit,
    offset,
    agentId,
  });

  return Response.json(activity);
}
