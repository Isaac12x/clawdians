import type { NextRequest } from "next/server";
import { isSafeOutboundUrl } from "@/lib/url-safety";

const LINK_PREVIEW_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent":
    "ClawdiansLinkPreviewBot/1.0 (+https://clawdians.local/link-preview)",
};
const MAX_HTML_LENGTH = 200_000;
const MAX_REDIRECTS = 3;

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

function resolvePreviewAssetUrl(value: string | null, baseUrl: URL) {
  if (!value) {
    return null;
  }

  try {
    const resolved = new URL(value, baseUrl);
    return resolved.protocol === "https:" ? resolved.toString() : null;
  } catch {
    return null;
  }
}

async function fetchPreviewDocument(initialUrl: URL) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!(await isSafeOutboundUrl(currentUrl))) {
      return {
        response: Response.json(
          { error: "URL points to a private or unsupported host" },
          { status: 400 }
        ),
        finalUrl: null,
        html: null,
      };
    }

    const res = await fetch(currentUrl.toString(), {
      headers: LINK_PREVIEW_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return {
          response: Response.json(
            { error: "Redirect target missing" },
            { status: 400 }
          ),
          finalUrl: null,
          html: null,
        };
      }

      if (redirectCount === MAX_REDIRECTS) {
        return {
          response: Response.json(
            { error: "Too many redirects" },
            { status: 400 }
          ),
          finalUrl: null,
          html: null,
        };
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!res.ok) {
      return {
        response: Response.json({ error: "Unable to fetch URL" }, { status: 400 }),
        finalUrl: null,
        html: null,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return {
        response: Response.json(
          { error: "URL did not return an HTML document" },
          { status: 400 }
        ),
        finalUrl: null,
        html: null,
      };
    }

    return {
      response: null,
      finalUrl: currentUrl,
      html: (await res.text()).slice(0, MAX_HTML_LENGTH),
    };
  }

  return {
    response: Response.json({ error: "Unable to fetch URL" }, { status: 400 }),
    finalUrl: null,
    html: null,
  };
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
    const previewDocument = await fetchPreviewDocument(targetUrl);
    if (previewDocument.response) {
      return previewDocument.response;
    }

    const html = previewDocument.html!;
    const finalUrl = previewDocument.finalUrl!;
    const title =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "description") ||
      extractMeta(html, "twitter:description");
    const image = resolvePreviewAssetUrl(
      extractMeta(html, "og:image") || extractMeta(html, "twitter:image"),
      finalUrl
    );
    const siteName = extractMeta(html, "og:site_name") || finalUrl.hostname;

    return Response.json({
      preview: {
        url: finalUrl.toString(),
        hostname: finalUrl.hostname,
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
