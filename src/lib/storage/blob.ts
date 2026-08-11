import { put, del } from "@vercel/blob";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/utils/env";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { logger } from "@/lib/utils/logger";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".data", "uploads");

async function ensureLocalDir(subdir: string) {
  const dir = path.join(LOCAL_STORAGE_DIR, subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function storePrivateBlob(
  data: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = `private/${Date.now()}-${randomBytes(8).toString("hex")}-${filename}`;

  if (env.blobToken) {
    const blob = await put(key, data, {
      access: "public", // Vercel Blob private requires enterprise; we gate via signed URLs
      token: env.blobToken,
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (env.isProd) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required in production. Enable Vercel Blob and set the token.",
    );
  }

  // Local filesystem fallback for development
  const dir = await ensureLocalDir("private");
  const filePath = path.join(dir, path.basename(key));
  await writeFile(filePath, data);
  return `local://${key}`;
}

export async function readStoredBlob(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("local://")) {
    const relative = storageKey.replace("local://", "");
    const filePath = path.join(LOCAL_STORAGE_DIR, "private", path.basename(relative));
    return readFile(filePath);
  }

  const response = await fetch(storageKey);
  if (!response.ok) {
    throw new Error("Failed to fetch stored blob");
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteStoredBlob(storageKey: string): Promise<void> {
  try {
    if (storageKey.startsWith("local://")) {
      const relative = storageKey.replace("local://", "");
      const filePath = path.join(LOCAL_STORAGE_DIR, "private", path.basename(relative));
      await unlink(filePath).catch(() => undefined);
      return;
    }
    if (env.blobToken) {
      await del(storageKey, { token: env.blobToken });
    }
  } catch (error) {
    logger.warn("Failed to delete blob", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function checksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function createSignedImageToken(
  imageId: string,
  variant: "original" | "blur" | "thumbnail",
  ttlSeconds = env.signedImageTtlSeconds,
): Promise<string> {
  return createSignedMediaToken(imageId, "asset", variant, ttlSeconds);
}

export async function createSignedMediaToken(
  mediaId: string,
  kind: "asset" | "capture",
  variant: "original" | "blur" | "thumbnail",
  ttlSeconds = env.signedImageTtlSeconds,
): Promise<string> {
  const secret = new TextEncoder().encode(env.authSecret);
  return new SignJWT({ mediaId, imageId: mediaId, kind, variant })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export async function verifySignedImageToken(
  token: string,
): Promise<{
  imageId: string;
  kind: "asset" | "capture";
  variant: "original" | "blur" | "thumbnail";
}> {
  const secret = new TextEncoder().encode(env.authSecret);
  const { payload } = await jwtVerify(token, secret);
  const kind =
    payload.kind === "capture" ? "capture" : ("asset" as const);
  return {
    imageId: String(payload.mediaId || payload.imageId),
    kind,
    variant: payload.variant as "original" | "blur" | "thumbnail",
  };
}
