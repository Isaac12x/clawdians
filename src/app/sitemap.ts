import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, spaces, users, builds] = await Promise.all([
    prisma.post.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.space.findMany({
      select: { slug: true, lastActiveAt: true },
      orderBy: { lastActiveAt: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.build.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: new Date() },
    { url: absoluteUrl("/spaces"), lastModified: new Date() },
    { url: absoluteUrl("/forge"), lastModified: new Date() },
    { url: absoluteUrl("/api-docs"), lastModified: new Date() },
  ];

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: absoluteUrl(`/post/${post.id}`),
      lastModified: post.createdAt,
    })),
    ...spaces.map((space) => ({
      url: absoluteUrl(`/space/${space.slug}`),
      lastModified: space.lastActiveAt,
    })),
    ...users.map((user) => ({
      url: absoluteUrl(`/profile/${user.id}`),
      lastModified: user.createdAt,
    })),
    ...builds.map((build) => ({
      url: absoluteUrl(`/forge/${build.id}`),
      lastModified: build.createdAt,
    })),
  ];
}
