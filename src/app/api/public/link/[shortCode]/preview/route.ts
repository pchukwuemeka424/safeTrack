import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { findLinkByShortCode, getPublicLinkState } from "@/lib/links/service";
import { isValidShortCode } from "@/lib/links/hostname";
import { normalizeShortCode } from "@/lib/links/short-code";
import { rateLimitFromRequest } from "@/lib/rate-limit";
import { ImageAsset } from "@/models/ImageAsset";
import { readStoredBlob } from "@/lib/storage/blob";

/**
 * Stable OG/crawler preview: serves only the blurred variant for a shortCode.
 * No location consent required. Never serves the clear original.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ shortCode: string }> },
) {
  const rl = rateLimitFromRequest(req, "public-preview", 60, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { shortCode: raw } = await ctx.params;
  const shortCode = normalizeShortCode(raw);

  if (!isValidShortCode(shortCode)) {
    return NextResponse.json({ status: "UNAVAILABLE" }, { status: 404 });
  }

  try {
    const state = await getPublicLinkState(shortCode);
    if (state.status !== "ACTIVE") {
      return NextResponse.json({ status: "UNAVAILABLE" }, { status: 404 });
    }

    const link = await findLinkByShortCode(shortCode);
    if (!link) {
      return NextResponse.json({ status: "UNAVAILABLE" }, { status: 404 });
    }

    await connectDb();
    const image = await ImageAsset.findById(link.imageId);
    if (!image?.blurStorageKey) {
      return NextResponse.json({ status: "UNAVAILABLE" }, { status: 404 });
    }

    const data = await readStoredBlob(image.blurStorageKey);

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Crawlers cache OG images; blur is intentionally low-fidelity.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ status: "UNAVAILABLE" }, { status: 404 });
  }
}
