import { headers } from "next/headers";
import type { Metadata } from "next";
import { Suspense } from "react";
import PublicInvestigationLinkPage from "./public-link-client";
import { buildLinkUrl, extractShortCodeFromHost } from "@/lib/links/hostname";
import { DecoyShell } from "@/components/public-link/decoy-shell";
import { env } from "@/lib/utils/env";

const DECOY_TITLE = "Northline — Shared media";
const DECOY_DESCRIPTION = "View shared media on Northline.";

function absoluteOrigin(host: string): string {
  const hostname = host.split(":")[0]?.toLowerCase() || "";
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1"
  ) {
    return `http://${host}`;
  }
  if (host) {
    return `https://${host.split(":")[0]}`;
  }
  return env.appUrl.replace(/\/$/, "");
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const shortCode = params.code || extractShortCodeFromHost(host) || "";

  const origin = absoluteOrigin(host) || env.appUrl.replace(/\/$/, "");
  const pageUrl = shortCode
    ? buildLinkUrl(shortCode)
    : `${origin}/public/investigation-link`;
  const previewImageUrl = shortCode
    ? `${origin}/api/public/link/${encodeURIComponent(shortCode)}/preview`
    : undefined;

  return {
    metadataBase: new URL(origin),
    title: { absolute: DECOY_TITLE },
    description: DECOY_DESCRIPTION,
    robots: { index: false, follow: false },
    icons: {
      icon: "/favicon.ico",
      apple: "/favicon.ico",
    },
    openGraph: {
      type: "website",
      url: pageUrl,
      title: DECOY_TITLE,
      description: DECOY_DESCRIPTION,
      siteName: "Northline",
      ...(previewImageUrl
        ? {
            images: [
              {
                url: previewImageUrl,
                type: "image/jpeg",
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
      ...(previewImageUrl ? { images: [previewImageUrl] } : {}),
    },
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const code = params.code || extractShortCodeFromHost(host) || "";

  return (
    <Suspense
      fallback={
        <DecoyShell>
          <div className="flex flex-1 items-center justify-center py-24">
            <p className="text-sm text-slate-500">Loading media…</p>
          </div>
        </DecoyShell>
      }
    >
      <PublicInvestigationLinkPage initialCode={code} />
    </Suspense>
  );
}
