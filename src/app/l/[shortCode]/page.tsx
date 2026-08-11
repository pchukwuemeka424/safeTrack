import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import PublicInvestigationLinkPage from "@/app/public/investigation-link/public-link-client";
import { DecoyShell } from "@/components/public-link/decoy-shell";
import { isValidShortCode } from "@/lib/links/hostname";
import { buildPublicLinkMetadata } from "@/lib/links/public-metadata";
import { notFound } from "next/navigation";

/**
 * Path-based public links (`/l/{code}`).
 * Owns OG/Twitter metadata so WhatsApp/Facebook can scrape thumbnails
 * without relying on middleware rewrites.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}): Promise<Metadata> {
  const { shortCode } = await params;
  const code = shortCode.toLowerCase().trim();
  const headerStore = await headers();
  return buildPublicLinkMetadata({
    shortCode: isValidShortCode(code) ? code : "",
    host: headerStore.get("host"),
  });
}

export default async function PublicLinkByPathPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const code = shortCode.toLowerCase().trim();
  if (!isValidShortCode(code)) notFound();

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
