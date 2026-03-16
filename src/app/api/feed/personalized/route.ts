import type { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { getPersonalizedFeed } from "@/lib/discovery";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);
  const sort = req.nextUrl.searchParams.get("sort") === "top" ? "top" : "new";
  const data = await getPersonalizedFeed({ userId, limit, offset, sort });

  return Response.json(data.posts);
}
