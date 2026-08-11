import { connectDb } from "@/lib/db/connection";
import { InvestigationLink } from "@/models/InvestigationLink";
import { generateShortCode, normalizeShortCode } from "@/lib/links/short-code";
import { buildLinkUrl } from "@/lib/links/hostname";
import type { InvestigationDocument } from "@/models/Investigation";
import mongoose from "mongoose";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findLinkByShortCode(shortCode: string) {
  const code = normalizeShortCode(shortCode);
  return InvestigationLink.findOne({
    shortCode: { $regex: new RegExp(`^${escapeRegex(code)}$`, "i") },
  });
}

export async function createInvestigationLink(input: {
  caseId: string;
  imageId: string;
  createdBy: string;
  investigation: InvestigationDocument;
}): Promise<{
  id: string;
  shortCode: string;
  url: string;
  expiresAt: Date;
}> {
  await connectDb();

  let shortCode = generateShortCode(10);
  let attempts = 0;

  while (attempts < 5) {
    const existing = await findLinkByShortCode(shortCode);
    if (!existing) break;
    shortCode = generateShortCode(10);
    attempts += 1;
  }

  const expiresAt = new Date(
    Date.now() + (input.investigation.linkExpiryHours || 72) * 60 * 60 * 1000,
  );

  const link = await InvestigationLink.create({
    shortCode,
    caseId: new mongoose.Types.ObjectId(input.caseId),
    imageId: new mongoose.Types.ObjectId(input.imageId),
    createdBy: new mongoose.Types.ObjectId(input.createdBy),
    status: "ACTIVE",
    expiresAt,
    maximumViews: 999999,
    currentViews: 0,
    locationRequired: input.investigation.locationRequired !== false,
    allowViewWithoutLocation: Boolean(input.investigation.allowViewWithoutLocation),
    consentText:
      input.investigation.consentMessage ||
      "OALS is requesting your current location because this investigation link has been configured to require location verification before the image can be viewed.",
  });

  return {
    id: link._id.toString(),
    shortCode: link.shortCode,
    url: buildLinkUrl(link.shortCode),
    expiresAt: link.expiresAt,
  };
}

export type PublicLinkState =
  | { status: "INVALID" }
  | { status: "EXPIRED" }
  | { status: "REVOKED" }
  | {
      status: "ACTIVE";
      shortCode: string;
      consentText: string;
      locationRequired: boolean;
      allowViewWithoutLocation: boolean;
      blurTokenAvailable: boolean;
    };

/**
 * Generic responses for invalid codes — never reveal whether a code existed.
 */
export async function getPublicLinkState(shortCode: string): Promise<PublicLinkState> {
  await connectDb();
  const link = await findLinkByShortCode(shortCode);
  const lean = link ? link.toObject() : null;

  if (!lean) {
    return { status: "INVALID" };
  }

  if (lean.status === "REVOKED" || lean.revokedAt) {
    return { status: "REVOKED" };
  }

  if (lean.status === "EXPIRED" || lean.expiresAt < new Date()) {
    if (lean.status !== "EXPIRED") {
      await InvestigationLink.updateOne(
        { _id: lean._id },
        { $set: { status: "EXPIRED" } },
      );
    }
    return { status: "EXPIRED" };
  }

  // Legacy MAX_VIEWS links are reopened — view caps are no longer enforced
  if (lean.status === "MAX_VIEWS") {
    await InvestigationLink.updateOne(
      { _id: lean._id },
      { $set: { status: "ACTIVE" } },
    );
  }

  if (lean.status !== "ACTIVE" && lean.status !== "MAX_VIEWS") {
    return { status: "INVALID" };
  }

  return {
    status: "ACTIVE",
    shortCode: normalizeShortCode(lean.shortCode),
    consentText: lean.consentText,
    locationRequired: lean.locationRequired,
    allowViewWithoutLocation: Boolean(lean.allowViewWithoutLocation),
    blurTokenAvailable: true,
  };
}
