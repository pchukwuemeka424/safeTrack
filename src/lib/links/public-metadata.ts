import type { Metadata } from "next";
import { buildLinkUrl } from "@/lib/links/hostname";
import { env } from "@/lib/utils/env";

export const DECOY_TITLE = "Northline — Shared media";
export const DECOY_DESCRIPTION = "View shared media on Northline.";

/** Canonical public origin for OG tags / absolute image URLs. */
export function publicOrigin(hostHeader?: string | null): string {
  const host = (hostHeader || "").split(":")[0]?.toLowerCase() || "";

  if (host && host !== "localhost" && !host.endsWith(".localhost") && host !== "127.0.0.1") {
    return `https://${host}`;
  }

  const configured = (env.appUrl || "").replace(/\/$/, "");
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`;
  }

  return "https://www.mylos.cyou";
}

export function buildPublicLinkMetadata(input: {
  shortCode: string;
  host?: string | null;
}): Metadata {
  const shortCode = input.shortCode.toLowerCase().trim();
  const origin = publicOrigin(input.host);
  const pageUrl = shortCode ? `${origin}/l/${shortCode}` : `${origin}/`;
  // Prefer path page URL for OG; keep subdomain URL only when explicitly enabled.
  const shareUrl =
    process.env.NEXT_PUBLIC_USE_SUBDOMAIN_LINKS === "true" && shortCode
      ? buildLinkUrl(shortCode)
      : pageUrl;

  const previewImageUrl = shortCode
    ? `${origin}/api/public/link/${encodeURIComponent(shortCode)}/preview`
    : undefined;

  return {
    metadataBase: new URL(origin),
    title: { absolute: DECOY_TITLE },
    description: DECOY_DESCRIPTION,
    robots: { index: false, follow: false },
    icons: {
      icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
      apple: [{ url: "/apple-icon.png" }],
    },
    openGraph: {
      type: "website",
      url: shareUrl,
      title: DECOY_TITLE,
      description: DECOY_DESCRIPTION,
      siteName: "Northline",
      locale: "en_GB",
      ...(previewImageUrl
        ? {
            images: [
              {
                url: previewImageUrl,
                secureUrl: previewImageUrl,
                type: "image/jpeg",
                width: 1200,
                height: 630,
                alt: "Shared media preview",
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: DECOY_TITLE,
      description: DECOY_DESCRIPTION,
      ...(previewImageUrl
        ? {
            images: [previewImageUrl],
          }
        : {}),
    },
    other: previewImageUrl
      ? {
          "og:image:width": "1200",
          "og:image:height": "630",
        }
      : undefined,
  };
}
