import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { getDiscoverFeed } from "@/lib/discovery";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);
  const data = await getDiscoverFeed({ userId, limit, offset });

  return Response.json(data.posts);
}
