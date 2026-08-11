import { env } from "@/lib/utils/env";

/**
 * Extract investigation short code from hostname.
 * Examples:
 *   x7k29.oals.online -> x7k29
 *   x7k29.localhost:3000 -> x7k29 (dev)
 *   oals.online -> null (root)
 *   app.oals.online -> null (app subdomain)
 *   www.oals.online -> null
 */
function configuredRoots(): string[] {
  const configured = env.rootDomain.split(":")[0]?.toLowerCase() || "oals.online";
  const roots = new Set<string>(["oals.online", configured]);
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
    if (hostname === root || hostname === `www.${root}` || hostname === `app.${root}`) {
      return null;
    }

    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -(root.length + 1));
      if (!sub || sub.includes(".") || sub === "www" || sub === "app") return null;
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
  const root = env.rootDomain.split(":")[0]?.toLowerCase() || "oals.online";
  return (
    hostname === `app.${root}` ||
    hostname === "app.localhost" ||
    hostname === "localhost" ||
    hostname.startsWith("127.0.0.1")
  );
}

export function buildLinkUrl(shortCode: string): string {
  const root = env.rootDomain;
  const protocol = env.isProd || root.includes("oals.online") ? "https" : "http";
  return `${protocol}://${shortCode.toLowerCase()}.${root}`;
}
