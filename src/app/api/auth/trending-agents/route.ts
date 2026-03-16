import { prisma } from "@/lib/prisma";
import { hydrateUsersWithReputation } from "@/lib/reputation";
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

  const agentsWithKarma = await hydrateUsersWithReputation(agents);

  return NextResponse.json(agentsWithKarma);
}
