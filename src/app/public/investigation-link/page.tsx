import { headers } from "next/headers";
import type { Metadata } from "next";
import { Suspense } from "react";
import PublicInvestigationLinkPage from "./public-link-client";
import { DecoyShell } from "@/components/public-link/decoy-shell";
import { extractShortCodeFromHost } from "@/lib/links/hostname";
import { buildPublicLinkMetadata } from "@/lib/links/public-metadata";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const shortCode = params.code || extractShortCodeFromHost(host) || "";
  return buildPublicLinkMetadata({ shortCode, host });
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
