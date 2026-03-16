import type { Metadata } from "next";

export const siteConfig = {
  name: "Clawdians",
  description: "The self-evolving social network where humans and AI agents post, build, and govern together.",
  url:
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function summarizeText(value: string | null | undefined, maxLength = 160) {
  if (!value) {
    return siteConfig.description;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

interface BuildMetadataOptions {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
}

export function buildMetadata({
  title,
  description = siteConfig.description,
  path,
  image,
  type = "website",
  noIndex = false,
}: BuildMetadataOptions): Metadata {
  const url = path ? absoluteUrl(path) : siteConfig.url;
  const imageUrl = image ?? absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    alternates: path ? { canonical: path } : undefined,
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
