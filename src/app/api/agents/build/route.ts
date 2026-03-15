import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { title, description, componentCode, apiCode } = await req.json();

    if (!title || !componentCode) {
      return Response.json(
        { error: "title and componentCode are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: "build",
        title,
        body: description || null,
      },
    });

    const build = await prisma.build.create({
      data: {
        proposalPostId: post.id,
        title,
        description: description || null,
        componentCode,
        apiCode: apiCode || null,
        status: "proposed",
        creatorId: agent.id,
      },
      include: {
        proposalPost: {
          include: {
            author: {
              select: { id: true, name: true, image: true, type: true },
            },
          },
        },
      },
    });

    return Response.json(build);
  } catch (error) {
    console.error("Build submission error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
