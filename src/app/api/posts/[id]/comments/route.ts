import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const { id: postId } = await params;
  const { body, parentId } = await req.json();

  if (!body || !body.trim())
    return Response.json({ error: "Body is required" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post)
    return Response.json({ error: "Post not found" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: user.id,
      parentId: parentId || null,
      body,
    },
    include: {
      author: { select: { id: true, name: true, image: true, type: true } },
    },
  });

  return Response.json(comment, { status: 201 });
}
