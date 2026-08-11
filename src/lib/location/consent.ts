import { InvestigationLink } from "@/models/InvestigationLink";
import { AccessEvent } from "@/models/AccessEvent";
import { LocationEvent } from "@/models/LocationEvent";
import { Investigation } from "@/models/Investigation";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import {
  encryptCoordinates,
  hashValue,
  encrypt,
} from "@/lib/security/encryption";
import { createSignedImageToken } from "@/lib/storage/blob";
import { writeAuditLog } from "@/lib/audit/write";
import { notifyLinkAccessed } from "@/lib/email";
import { env } from "@/lib/utils/env";
import { UAParser } from "ua-parser-js";
import type { ConsentStatus } from "@/types";
import { findLinkByShortCode } from "@/lib/links/service";
import { connectDb } from "@/lib/db/connection";
import { reverseGeocode } from "@/lib/location/reverse-geocode";

interface LocationConsentInput {
  shortCode: string;
  consentStatus: ConsentStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: number;
  ip?: string;
  userAgent?: string;
}

export async function processLocationConsent(input: LocationConsentInput) {
  await connectDb();

  const link = await findLinkByShortCode(input.shortCode);
  if (!link || link.status !== "ACTIVE" || link.expiresAt < new Date()) {
    // Generic failure — do not leak existence
    return { ok: false as const, error: "Unable to process request" };
  }

  if (link.currentViews >= link.maximumViews) {
    link.status = "MAX_VIEWS";
    await link.save();
    return { ok: false as const, error: "Unable to process request" };
  }

  const parser = new UAParser(input.userAgent || "");
  const ua = parser.getResult();
  const now = new Date();

  let imageToken: string | null = null;
  let unlocked = false;

  if (input.consentStatus === "GRANTED") {
    if (
      input.latitude == null ||
      input.longitude == null ||
      input.accuracy == null
    ) {
      return { ok: false as const, error: "Unable to process request" };
    }

    const place = await reverseGeocode(input.latitude, input.longitude);
    const encryptedCoords = encryptCoordinates(
      input.latitude,
      input.longitude,
    );
    const encryptedAddress = place.address ? encrypt(place.address) : null;

    const accessEvent = await AccessEvent.create({
      linkId: link._id,
      caseId: link.caseId,
      timestamp: now,
      consentStatus: input.consentStatus,
      consentRequestedAt: now,
      consentGrantedAt: now,
      encryptedCoordinates: encryptedCoords,
      accuracy: input.accuracy,
      approximateIpLocation: [place.city, place.country]
        .filter(Boolean)
        .join(", ") || null,
      city: place.city,
      country: place.country,
      ipHash: input.ip ? hashValue(input.ip) : null,
      encryptedIp: env.storeRawIp && input.ip ? encrypt(input.ip) : null,
      userAgent: input.userAgent || null,
      deviceCategory: ua.device.type || "desktop",
      browser: ua.browser.name || null,
      operatingSystem: ua.os.name || null,
      eventType: "CONSENT_GRANTED",
    });

    const investigation = await Investigation.findById(link.caseId);
    const retentionDays =
      investigation?.retentionDays || env.defaultRetentionDays;

    await LocationEvent.create({
      accessEventId: accessEvent._id,
      linkId: link._id,
      caseId: link.caseId,
      encryptedCoordinates: encryptedCoords,
      encryptedAddress,
      city: place.city,
      country: place.country,
      accuracy: input.accuracy,
      capturedAt: input.timestamp ? new Date(input.timestamp) : now,
      consentStatus: "GRANTED",
      retentionExpiresAt: new Date(
        Date.now() + retentionDays * 24 * 60 * 60 * 1000,
      ),
    });

    // Atomic view increment with max-views guard
    const updated = await InvestigationLink.findOneAndUpdate(
      {
        _id: link._id,
        status: "ACTIVE",
        currentViews: { $lt: link.maximumViews },
      },
      {
        $inc: { currentViews: 1 },
        $set: {
          lastAccessAt: now,
          ...(link.firstAccessAt ? {} : { firstAccessAt: now }),
        },
      },
      { new: true },
    );

    if (!updated) {
      return { ok: false as const, error: "Unable to process request" };
    }

    if (updated.currentViews >= updated.maximumViews) {
      updated.status = "MAX_VIEWS";
      await updated.save();
    }

    imageToken = await createSignedImageToken(
      link.imageId.toString(),
      "original",
    );
    unlocked = true;

    await writeAuditLog({
      action: "LOCATION_CONSENT_GRANTED",
      resourceType: "InvestigationLink",
      resourceId: link._id.toString(),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    // Notify investigator (no coordinates in notification)
    const creator = await User.findById(link.createdBy);
    if (creator) {
      const inv = investigation || (await Investigation.findById(link.caseId));
      await Notification.create({
        userId: creator._id,
        type: "LOCATION_GRANTED",
        title: "Location permission granted",
        body: "An investigation link was accessed and location permission was granted. View the event securely in OALS.",
        caseId: link.caseId,
        linkId: link._id,
      });
      if (inv) {
        await notifyLinkAccessed(creator.email, inv.caseReference);
      }
    }
  } else {
    await AccessEvent.create({
      linkId: link._id,
      caseId: link.caseId,
      timestamp: now,
      consentStatus: input.consentStatus,
      consentRequestedAt: now,
      consentGrantedAt: null,
      encryptedCoordinates: null,
      accuracy: null,
      ipHash: input.ip ? hashValue(input.ip) : null,
      encryptedIp: env.storeRawIp && input.ip ? encrypt(input.ip) : null,
      userAgent: input.userAgent || null,
      deviceCategory: ua.device.type || "desktop",
      browser: ua.browser.name || null,
      operatingSystem: ua.os.name || null,
      eventType:
        input.consentStatus === "DENIED" ? "CONSENT_DENIED" : "ERROR",
    });

    await writeAuditLog({
      action:
        input.consentStatus === "DENIED"
          ? "LOCATION_CONSENT_DENIED"
          : "LOCATION_CONSENT_REQUESTED",
      resourceType: "InvestigationLink",
      resourceId: link._id.toString(),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    if (
      input.consentStatus === "DENIED" &&
      link.allowViewWithoutLocation &&
      !link.locationRequired
    ) {
      imageToken = await createSignedImageToken(
        link.imageId.toString(),
        "original",
      );
      unlocked = true;
    }
  }

  return {
    ok: true as const,
    unlocked,
    imageToken,
    consentStatus: input.consentStatus,
  };
}
