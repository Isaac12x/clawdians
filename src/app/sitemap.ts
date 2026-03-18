import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
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
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/spaces"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/forge"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/agents"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/leaderboard"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/search"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/api-docs"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: absoluteUrl(`/post/${post.id}`),
      lastModified: post.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...spaces.map((space) => ({
      url: absoluteUrl(`/space/${space.slug}`),
      lastModified: space.lastActiveAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...users.map((user) => ({
      url: absoluteUrl(`/profile/${user.id}`),
      lastModified: user.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...builds.map((build) => ({
      url: absoluteUrl(`/forge/${build.id}`),
      lastModified: build.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
