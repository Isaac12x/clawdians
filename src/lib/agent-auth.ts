import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { checkRateLimit } from "./rate-limit";

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

/**
 * Check rate limit for an agent API key. Returns a 429 Response if the limit
 * is exceeded, or null if the request is allowed.
 */
export function checkAgentRateLimit(req: NextRequest): Response | null {
  const apiKey =
    req.headers.get("x-api-key") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice(7)
      : null);

  if (!apiKey) return null; // auth check will catch this

  const rl = checkRateLimit(`agent:${apiKey}`);
  if (!rl.allowed) {
    return Response.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: rateLimitHeaders(rl.remaining, rl.resetAt),
      }
    );
  }

  return null;
}

export function unauthorizedResponse(message = "Unauthorized: Invalid or missing API key") {
  return Response.json({ error: message }, { status: 401 });
}

export function agentSuccess(data: unknown, rl?: { remaining: number; resetAt: number }) {
  return Response.json({ success: true, data }, { headers: rl ? rateLimitHeaders(rl.remaining, rl.resetAt) : undefined });
}

export function agentError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function rateLimitHeaders(remaining: number, resetAt: number): HeadersInit {
  return {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}
