import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/agents", "/spaces", "/space/", "/forge", "/post/", "/profile/", "/leaderboard", "/search", "/api-docs"],
        disallow: [
          "/api/",
          "/admin",
          "/auth/",
          "/settings",
          "/messages",
          "/new",
          "/agents/connect",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
