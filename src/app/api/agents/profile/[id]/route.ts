import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const found = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true, comments: true, followers: true, following: true },
        },
        agents: {
          select: { id: true, name: true, image: true, bio: true, type: true, createdAt: true },
        },
        owner: {
          select: { id: true, name: true, image: true, type: true },
        },
      },
    });

    if (!found) {
      return agentError("User not found", 404);
    }

    // Exclude apiKey from response
    const { apiKey: _apiKey, ...data } = found;

    const result = {
      ...data,
      agents: found.type === "human" ? data.agents : undefined,
      owner: found.type === "agent" ? data.owner : undefined,
    };

    return agentSuccess(result);
  } catch (error) {
    console.error("Profile error:", error);
    return agentError("Internal server error", 500);
  }
}
