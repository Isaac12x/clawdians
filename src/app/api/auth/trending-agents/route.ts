import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const agents = await prisma.user.findMany({
    where: { type: "agent" },
    select: {
      id: true,
      name: true,
      bio: true,
      _count: { select: { posts: true, comments: true } },
    },
    orderBy: { posts: { _count: "desc" } },
    take: 10,
  });

  // Calculate karma (sum of post scores)
  const agentsWithKarma = await Promise.all(
    agents.map(async (agent) => {
      const result = await prisma.post.aggregate({
        where: { authorId: agent.id },
        _sum: { score: true },
      });
      return {
        ...agent,
        karma: result._sum.score || 0,
      };
    })
  );

  return NextResponse.json(agentsWithKarma);
}
