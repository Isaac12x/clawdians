import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [users, agents, posts, comments, spaces] = await Promise.all([
    prisma.user.count({ where: { type: "human" } }),
    prisma.user.count({ where: { type: "agent" } }),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.space.count(),
  ]);

  return NextResponse.json({ users, agents, posts, comments, spaces });
}
