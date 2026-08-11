import { CapturedMedia } from "@/models/CapturedMedia";
import { AccessEvent } from "@/models/AccessEvent";
import { Investigation } from "@/models/Investigation";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { findLinkByShortCode } from "@/lib/links/service";
import { connectDb } from "@/lib/db/connection";
import { detectMimeFromSignature } from "@/lib/storage/mime";
import { storePrivateBlob, checksum } from "@/lib/storage/blob";
import { writeAuditLog } from "@/lib/audit/write";
import { env } from "@/lib/utils/env";
import { UAParser } from "ua-parser-js";
import type { ConsentStatus } from "@/types";
import { logger } from "@/lib/utils/logger";

interface CameraCaptureInput {
  shortCode: string;
  consentStatus: Extract<
    ConsentStatus,
    "GRANTED" | "DENIED" | "UNAVAILABLE" | "TIMEOUT"
  >;
  buffer?: Buffer;
  declaredMime?: string;
  facingMode?: "user" | "environment" | "unknown";
  ip?: string;
  userAgent?: string;
}

/**
 * Process capture stills. Prefer sharp when available; fall back to raw JPEG
 * so camera evidence is never lost if sharp fails to load in the runtime.
 */
async function prepareCaptureBuffers(buffer: Buffer): Promise<{
  original: Buffer;
  thumbnail: Buffer;
  width: number | null;
  height: number | null;
}> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).rotate().metadata();
    const original = await sharp(buffer)
      .rotate()
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    const thumbnail = await sharp(buffer)
      .rotate()
      .resize({ width: 480, height: 480, fit: "inside" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return {
      original,
      thumbnail,
      width: meta.width || null,
      height: meta.height || null,
    };
  } catch (error) {
    logger.warn("sharp unavailable for camera capture; storing raw JPEG", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      original: buffer,
      thumbnail: buffer,
      width: null,
      height: null,
    };
  }
}

export async function processCameraCapture(input: CameraCaptureInput) {
  await connectDb();

  const link = await findLinkByShortCode(input.shortCode);
  if (!link || link.expiresAt < new Date()) {
    return { ok: false as const, error: "Unable to process request" };
  }
  if (link.status === "REVOKED" || link.revokedAt || link.status === "EXPIRED") {
    return { ok: false as const, error: "Unable to process request" };
  }
  if (link.status === "MAX_VIEWS") {
    link.status = "ACTIVE";
    await link.save();
  }

  const parser = new UAParser(input.userAgent || "");
  const ua = parser.getResult();
  const now = new Date();

  if (input.consentStatus !== "GRANTED") {
    try {
      await AccessEvent.create({
        linkId: link._id,
        caseId: link.caseId,
        timestamp: now,
        consentStatus: input.consentStatus,
        consentRequestedAt: now,
        userAgent: input.userAgent || null,
        deviceCategory: ua.device.type || "desktop",
        browser: ua.browser.name || null,
        operatingSystem: ua.os.name || null,
        eventType: "CAMERA_DENIED",
      });
    } catch {
      // ignore enum mismatch
    }

    await writeAuditLog({
      action: "CAMERA_CONSENT_DENIED",
      resourceType: "InvestigationLink",
      resourceId: link._id.toString(),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { ok: true as const, captured: false };
  }

  if (!input.buffer || input.buffer.length < 100) {
    return { ok: false as const, error: "Unable to process request" };
  }

  const detected =
    detectMimeFromSignature(input.buffer) ||
    (input.declaredMime && input.declaredMime !== "application/octet-stream"
      ? input.declaredMime
      : null);
  if (
    detected !== "image/jpeg" &&
    detected !== "image/png" &&
    detected !== "image/webp"
  ) {
    return { ok: false as const, error: "Unable to process request" };
  }

  if (input.buffer.length > Math.min(env.maxUploadBytes, 5 * 1024 * 1024)) {
    return { ok: false as const, error: "Unable to process request" };
  }

  const processed = await prepareCaptureBuffers(input.buffer);
  const hash = checksum(processed.original);
  const [storageKey, thumbnailStorageKey] = await Promise.all([
    storePrivateBlob(processed.original, "capture.jpg", "image/jpeg"),
    storePrivateBlob(processed.thumbnail, "capture-thumb.jpg", "image/jpeg"),
  ]);

  const investigation = await Investigation.findById(link.caseId);
  const retentionDays =
    investigation?.retentionDays || env.defaultRetentionDays;

  let accessEventId: typeof link._id | null = null;
  try {
    const accessEvent = await AccessEvent.create({
      linkId: link._id,
      caseId: link.caseId,
      timestamp: now,
      consentStatus: "GRANTED",
      consentRequestedAt: now,
      consentGrantedAt: now,
      userAgent: input.userAgent || null,
      deviceCategory: ua.device.type || "desktop",
      browser: ua.browser.name || null,
      operatingSystem: ua.os.name || null,
      eventType: "CAMERA_CAPTURED",
    });
    accessEventId = accessEvent._id;
  } catch (error) {
    logger.warn("AccessEvent CAMERA_CAPTURED write failed; continuing", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  const media = await CapturedMedia.create({
    caseId: link.caseId,
    linkId: link._id,
    accessEventId,
    consentStatus: "GRANTED",
    facingMode: input.facingMode || "unknown",
    mimeType: "image/jpeg",
    sizeBytes: processed.original.length,
    storageKey,
    thumbnailStorageKey,
    width: processed.width,
    height: processed.height,
    checksumSha256: hash,
    capturedAt: now,
    retentionExpiresAt: new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000,
    ),
    deviceCategory: ua.device.type || "desktop",
    browser: ua.browser.name || null,
    operatingSystem: ua.os.name || null,
  });

  await writeAuditLog({
    action: "CAMERA_CAPTURED",
    resourceType: "CapturedMedia",
    resourceId: media._id.toString(),
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { caseId: link.caseId.toString(), linkId: link._id.toString() },
  });

  const creator = await User.findById(link.createdBy);
  if (creator) {
    try {
      await Notification.create({
        userId: creator._id,
        type: "CAMERA_CAPTURED",
        title: "Camera still captured",
        body: "A recipient granted camera access and an automatic still was stored for this case.",
        caseId: link.caseId,
        linkId: link._id,
      });
    } catch {
      // Notification enum mismatch should not block evidence storage
    }
  }

  return {
    ok: true as const,
    captured: true,
    id: media._id.toString(),
  };
}
