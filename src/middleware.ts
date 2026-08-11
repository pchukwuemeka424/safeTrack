import { NextResponse, type NextRequest } from "next/server";
import { extractShortCodeFromHost } from "@/lib/links/hostname";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;
  const shortCode = extractShortCodeFromHost(host);

  // Path links `/l/{code}` are handled by `src/app/l/[shortCode]` so OG metadata
  // is generated on the real route (required for WhatsApp/Facebook previews).

  const response =
    shortCode &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/public/investigation-link") &&
    !pathname.startsWith("/l/")
      ? NextResponse.rewrite(
          new URL(
            `/public/investigation-link?code=${encodeURIComponent(shortCode)}`,
            request.url,
          ),
        )
      : NextResponse.next();

  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(self), camera=(), microphone=(), interest-cohort=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com",
      "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://unpkg.com",
      "img-src 'self' data: blob: https: https://*.tile.openstreetmap.org",
      "font-src 'self' data:",
      "connect-src 'self' https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://*.public.blob.vercel-storage.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
