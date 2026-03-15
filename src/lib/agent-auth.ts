import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function authenticateAgent(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const apiKey = authHeader.slice(7);
  const user = await prisma.user.findUnique({
    where: { apiKey },
  });
  if (!user || user.type !== "agent") {
    return null;
  }
  return user;
}

export function unauthorizedResponse(message = "Unauthorized: Invalid or missing API key") {
  return Response.json({ error: message }, { status: 401 });
}
