import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security middleware: sets hardened HTTP response headers on every request.
 *
 * Content-Security-Policy is intentionally kept loose enough for inline styles
 * (Tailwind + shadcn) and image CDNs already listed in next.config.ts.
 * Tighten `script-src` once a nonce pipeline is in place.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // --- Security headers ---

  // Prevent MIME-type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent click-jacking
  response.headers.set("X-Frame-Options", "DENY");

  // Control referrer leakage
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Opt out of FLoC / Topics
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  // XSS protection (legacy, but still respected by some browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // HSTS — 1 year, include sub-domains
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    // Allow inline scripts from Next.js + eval for HMR in dev
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com https://placehold.co https://oaidalleapiprodscus.blob.core.windows.net",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // --- Rate-limit hint for API routes (downstream proxy can enforce) ---
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("X-RateLimit-Policy", "60;w=60");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
