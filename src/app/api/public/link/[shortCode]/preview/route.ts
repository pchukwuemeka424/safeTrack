import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { connectDb } from "@/lib/db/connection";
import { findLinkByShortCode, getPublicLinkState } from "@/lib/links/service";
import { isValidShortCode } from "@/lib/links/hostname";
import { normalizeShortCode } from "@/lib/links/short-code";
import { rateLimitFromRequest } from "@/lib/rate-limit";
import { ImageAsset } from "@/models/ImageAsset";
import { readStoredBlob } from "@/lib/storage/blob";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function placeholderOg(): Promise<Buffer> {
  const svg = `
    <svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#f8fafc" font-size="64" font-family="Arial, sans-serif" font-weight="700">Northline</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#94a3b8" font-size="28" font-family="Arial, sans-serif">Shared media</text>
    </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

/**
 * Stable OG/crawler preview: blurred media cropped to 1200×630 for WhatsApp/Facebook.
 * No location consent required. Never serves the clear original.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ shortCode: string }> },
) {
  const rl = rateLimitFromRequest(req, "public-preview", 120, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { shortCode: raw } = await ctx.params;
  const shortCode = normalizeShortCode(raw);

  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control":
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
  } as const;

  if (!isValidShortCode(shortCode)) {
    const fallback = await placeholderOg();
    return new NextResponse(new Uint8Array(fallback), { status: 200, headers });
  }

  try {
    const state = await getPublicLinkState(shortCode);
    if (state.status !== "ACTIVE") {
      const fallback = await placeholderOg();
      return new NextResponse(new Uint8Array(fallback), {
        status: 200,
        headers,
      });
    }

    const link = await findLinkByShortCode(shortCode);
    if (!link) {
      const fallback = await placeholderOg();
      return new NextResponse(new Uint8Array(fallback), {
        status: 200,
        headers,
      });
    }

    await connectDb();
    const image = await ImageAsset.findById(link.imageId);
    if (!image?.blurStorageKey) {
      const fallback = await placeholderOg();
      return new NextResponse(new Uint8Array(fallback), {
        status: 200,
        headers,
      });
    }

    const data = await readStoredBlob(image.blurStorageKey);

    // WhatsApp/Facebook expect ~1200×630 JPEGs with explicit dimensions.
    const og = await sharp(data)
      .rotate()
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
      .blur(18)
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(og), {
      status: 200,
      headers: {
        ...headers,
        "Content-Length": String(og.length),
      },
    });
  } catch {
    const fallback = await placeholderOg();
    return new NextResponse(new Uint8Array(fallback), { status: 200, headers });
  }
}
