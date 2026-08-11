import { env } from "@/lib/utils/env";

/**
 * Extract investigation short code from hostname.
 * Examples:
 *   x7k29.mylos.cyou -> x7k29
 *   x7k29.localhost:3000 -> x7k29 (dev)
 *   mylos.cyou -> null (root)
 *   app.mylos.cyou -> null (app subdomain)
 *   www.mylos.cyou -> null
 */
function configuredRoots(): string[] {
  const configured =
    env.rootDomain.split(":")[0]?.toLowerCase() || "mylos.cyou";
  const roots = new Set<string>(["mylos.cyou", configured]);
  // Ignore localhost as a multi-label production-style root
  roots.delete("localhost");
  return [...roots];
}

export function extractShortCodeFromHost(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() || "";

  // Local development helpers: shortcode.localhost
  if (hostname.endsWith(".localhost") || hostname === "localhost") {
    if (hostname === "localhost" || hostname === "app.localhost") return null;
    const sub = hostname.replace(/\.localhost$/, "");
    if (!sub || sub === "www" || sub === "app") return null;
    return isValidShortCode(sub) ? sub : null;
  }

  for (const root of configuredRoots()) {
    if (
      hostname === root ||
      hostname === `www.${root}` ||
      hostname === `app.${root}`
    ) {
      return null;
    }

    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -(root.length + 1));
      if (!sub || sub.includes(".") || sub === "www" || sub === "app")
        return null;
      return isValidShortCode(sub) ? sub : null;
    }
  }

  return null;
}

export function isValidShortCode(code: string): boolean {
  return /^[A-Za-z0-9]{4,16}$/.test(code);
}

export function isAppHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() || "";
  const root = env.rootDomain.split(":")[0]?.toLowerCase() || "mylos.cyou";
  return (
    hostname === `app.${root}` ||
    hostname === "app.localhost" ||
    hostname === "localhost" ||
    hostname.startsWith("127.0.0.1")
  );
}

/**
 * Prefer path-based links (`/l/{code}`) — works on Vercel without wildcard DNS.
 * Set NEXT_PUBLIC_USE_SUBDOMAIN_LINKS=true only when `*.mylos.cyou` is configured.
 */
export function buildLinkUrl(shortCode: string): string {
  const code = shortCode.toLowerCase();

  if (process.env.NEXT_PUBLIC_USE_SUBDOMAIN_LINKS === "true") {
    const root = env.rootDomain;
    const protocol =
      env.isProd || (!root.includes("localhost") && !root.startsWith("127."))
        ? "https"
        : "http";
    return `${protocol}://${code}.${root}`;
  }

  const base = env.appUrl.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/l/${code}`;
}
