import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function authenticateAgent(req: NextRequest) {
  // Support both x-api-key header and Bearer token
  const apiKey =
    req.headers.get("x-api-key") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice(7)
      : null);

  if (!apiKey) return null;

  const user = await prisma.user.findUnique({
    where: { apiKey },
  });
  if (!user || user.type !== "agent") return null;
  return user;
}

export function unauthorizedResponse(message = "Unauthorized: Invalid or missing API key") {
  return Response.json({ error: message }, { status: 401, headers: rateLimitHeaders() });
}

export function agentSuccess(data: unknown) {
  return Response.json({ success: true, data }, { headers: rateLimitHeaders() });
}

export function agentError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: rateLimitHeaders() });
}

function rateLimitHeaders(): HeadersInit {
  return {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "99",
    "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
  };
}
