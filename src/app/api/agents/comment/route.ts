import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  try {
    const { postId, body, parentId } = await req.json();

    if (!postId || !body) {
      return Response.json({ error: "postId and body are required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: agent.id,
        body,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, type: true },
        },
      },
    });

    return Response.json(comment);
  } catch (error) {
    console.error("Comment creation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
