import sharp from "sharp";
import { env } from "@/lib/utils/env";
import { detectMimeFromSignature } from "@/lib/storage/mime";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export { detectMimeFromSignature };

export function validateImageUpload(
  buffer: Buffer,
  declaredMime: string,
): { ok: true; mime: string } | { ok: false; error: string } {
  if (buffer.length > env.maxUploadBytes) {
    return { ok: false, error: "File exceeds maximum allowed size" };
  }

  if (!ALLOWED_MIME.has(declaredMime)) {
    return { ok: false, error: "Unsupported file type" };
  }

  const detected = detectMimeFromSignature(buffer);
  if (!detected || detected !== declaredMime) {
    return { ok: false, error: "File signature does not match declared type" };
  }

  // Reject obvious executable markers
  const head = buffer.subarray(0, 4).toString("ascii");
  if (head.startsWith("MZ") || head.startsWith("\x7fELF")) {
    return { ok: false, error: "Executable files are not allowed" };
  }

  return { ok: true, mime: detected };
}

export async function processImage(buffer: Buffer): Promise<{
  original: Buffer;
  blur: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
}> {
  // Strip metadata (EXIF etc.) by re-encoding
  const image = sharp(buffer).rotate();
  const meta = await image.metadata();

  const original = await sharp(buffer)
    .rotate()
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  const blur = await sharp(buffer)
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .blur(28)
    .jpeg({ quality: 60 })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .rotate()
    .resize({ width: 320, height: 320, fit: "inside" })
    .jpeg({ quality: 70 })
    .toBuffer();

  return {
    original,
    blur,
    thumbnail,
    width: meta.width || 0,
    height: meta.height || 0,
  };
}

/**
 * Malware scanning integration point.
 * Hook your scanner (ClamAV, cloud AV API) here in production.
 */
export async function scanForMalware(
  buffer: Buffer,
): Promise<"PENDING" | "CLEAN" | "SUSPICIOUS" | "BLOCKED" | "SKIPPED"> {
  void buffer;
  return "SKIPPED";
}
