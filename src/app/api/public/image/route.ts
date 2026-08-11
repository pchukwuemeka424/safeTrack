import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { ImageAsset } from "@/models/ImageAsset";
import {
  verifySignedImageToken,
  readStoredBlob,
} from "@/lib/storage/blob";
import { rateLimitFromRequest } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rl = rateLimitFromRequest(req, "public-image", 120, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await verifySignedImageToken(token);
    await connectDb();
    const image = await ImageAsset.findById(payload.imageId);
    if (!image) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const key =
      payload.variant === "blur"
        ? image.blurStorageKey
        : payload.variant === "thumbnail"
          ? image.thumbnailStorageKey
          : image.storageKey;

    const data = await readStoredBlob(key);

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
