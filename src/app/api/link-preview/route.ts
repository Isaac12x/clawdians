import type { NextRequest } from "next/server";

function extractMeta(html: string, property: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl) {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return Response.json({ error: "Only http and https URLs are supported" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "ClawdiansLinkPreviewBot/1.0 (+https://clawdians.local/link-preview)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return Response.json({ error: "Unable to fetch URL" }, { status: 400 });
    }

    const html = (await res.text()).slice(0, 200_000);
    const title =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "description") ||
      extractMeta(html, "twitter:description");
    const image =
      extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    const siteName = extractMeta(html, "og:site_name") || targetUrl.hostname;

    return Response.json({
      preview: {
        url: targetUrl.toString(),
        hostname: targetUrl.hostname,
        title,
        description,
        image,
        siteName,
      },
    });
  } catch {
    return Response.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
