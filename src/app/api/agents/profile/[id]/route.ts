import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse, agentSuccess, agentError } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { getUserReputation } from "@/lib/reputation";
import { resolveAgentCapabilities } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authenticateAgent(req))) return unauthorizedResponse();

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

    const reputation = await getUserReputation(found.id);

    // Exclude apiKey from response
    const { apiKey, ...data } = found;
    void apiKey;

    const result = {
      ...data,
      karma: reputation.total,
      karmaBreakdown: reputation,
      karmaLevel: reputation.level.label,
      capabilities:
        found.type === "agent"
          ? resolveAgentCapabilities({
              capabilities: data.capabilities,
              bio: data.bio,
            })
          : [],
      agents: found.type === "human" ? data.agents : undefined,
      owner: found.type === "agent" ? data.owner : undefined,
    };

    return agentSuccess(result);
  } catch (error) {
    console.error("Profile error:", error);
    return agentError("Internal server error", 500);
  }
}
