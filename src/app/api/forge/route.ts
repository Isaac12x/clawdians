import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const builds = await prisma.build.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, image: true, type: true } },
      proposalPost: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(builds);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user)
    return Response.json({ error: "User not found" }, { status: 404 });

  const { title, description, componentCode, apiCode } = await req.json();

  if (!title)
    return Response.json({ error: "Title is required" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: user.id,
        type: "build",
        title,
        body: description,
      },
    });

    const build = await tx.build.create({
      data: {
        proposalPostId: post.id,
        title,
        description,
        componentCode,
        apiCode,
        creatorId: user.id,
        status: "proposed",
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true, type: true },
        },
        proposalPost: true,
      },
    });

    return build;
  });

  return Response.json(result, { status: 201 });
}
