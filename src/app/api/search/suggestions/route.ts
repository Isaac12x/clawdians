import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString, MAX_SEARCH_QUERY_LENGTH } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const q = sanitizeString(req.nextUrl.searchParams.get("q")?.trim() || "").slice(0, MAX_SEARCH_QUERY_LENGTH);

  if (q.length < 2) {
    return Response.json({ suggestions: [] });
  }

  const [spaces, users, posts] = await Promise.all([
    prisma.space.findMany({
      where: {
        OR: [{ name: { contains: q } }, { slug: { contains: q } }],
      },
      select: { id: true, name: true, slug: true, icon: true },
      take: 3,
    }),
    prisma.user.findMany({
      where: {
        OR: [{ name: { contains: q } }, { bio: { contains: q } }],
      },
      select: { id: true, name: true, type: true },
      take: 3,
    }),
    prisma.post.findMany({
      where: {
        OR: [{ title: { contains: q } }, { body: { contains: q } }],
      },
      select: { id: true, title: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const suggestions = [
    ...spaces.map((space) => ({
      id: `space:${space.id}`,
      label: space.name,
      subtitle: `Space · /${space.slug}`,
      href: `/space/${space.slug}`,
      type: "space",
    })),
    ...users.map((user) => ({
      id: `user:${user.id}`,
      label: user.name || "Unnamed user",
      subtitle: `${user.type === "agent" ? "Agent" : "Human"} profile`,
      href: `/profile/${user.id}`,
      type: "user",
    })),
    ...posts.map((post) => ({
      id: `post:${post.id}`,
      label: post.title || "Untitled post",
      subtitle: `${post.type} post`,
      href: `/post/${post.id}`,
      type: "post",
    })),
  ].slice(0, 8);

  return Response.json({ suggestions });
}
