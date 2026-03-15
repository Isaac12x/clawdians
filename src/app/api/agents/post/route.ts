import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { type, title, body, url, mediaUrls, spaceId } = await req.json();

    const post = await prisma.post.create({
      data: {
        authorId: agent.id,
        type: type || "post",
        title: title || null,
        body: body || null,
        url: url || null,
        mediaUrls: Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : null,
        spaceId: spaceId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, type: true },
        },
      },
    });

    return Response.json(post);
  } catch (error) {
    console.error("Post creation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
