import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { ImageAsset } from "@/models/ImageAsset";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import {
  validateImageUpload,
  processImage,
  scanForMalware,
} from "@/lib/storage/image";
import { storePrivateBlob, checksum } from "@/lib/storage/blob";
import { writeAuditLog } from "@/lib/audit/write";
import { rateLimitFromRequest, getClientIp } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const rl = rateLimitFromRequest(req, "upload", 20, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await requireAuthPermission("evidence:upload");
    const { id } = await ctx.params;
    await connectDb();

    const investigation = await Investigation.findById(id);
    if (!investigation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      user.role !== "ADMIN" &&
      investigation.createdBy.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateImageUpload(buffer, file.type);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const scan = await scanForMalware(buffer);
    if (scan === "BLOCKED" || scan === "SUSPICIOUS") {
      return NextResponse.json(
        { error: "File failed security checks" },
        { status: 400 },
      );
    }

    const processed = await processImage(buffer);
    const hash = checksum(processed.original);

    const [storageKey, blurStorageKey, thumbnailStorageKey] = await Promise.all([
      storePrivateBlob(processed.original, "original.jpg", "image/jpeg"),
      storePrivateBlob(processed.blur, "blur.jpg", "image/jpeg"),
      storePrivateBlob(processed.thumbnail, "thumb.jpg", "image/jpeg"),
    ]);

    const image = await ImageAsset.create({
      caseId: investigation._id,
      uploadedBy: user.id,
      originalFilename: file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
      mimeType: "image/jpeg",
      sizeBytes: processed.original.length,
      storageKey,
      blurStorageKey,
      thumbnailStorageKey,
      width: processed.width,
      height: processed.height,
      checksumSha256: hash,
      malwareScanStatus: scan,
      metadataStripped: true,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "IMAGE_UPLOADED",
      resourceType: "ImageAsset",
      resourceId: image._id.toString(),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { caseId: id },
    });

    return NextResponse.json({
      id: image._id.toString(),
      originalFilename: image.originalFilename,
      sizeBytes: image.sizeBytes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    if (message.includes("BLOB_READ_WRITE_TOKEN")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return toErrorResponse(error);
  }
}
