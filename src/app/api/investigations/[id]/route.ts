import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { InvestigationLink } from "@/models/InvestigationLink";
import { ImageAsset } from "@/models/ImageAsset";
import { AccessEvent } from "@/models/AccessEvent";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import type { SessionUser } from "@/types";

async function canAccessCase(user: SessionUser, caseId: string) {
  const investigation = await Investigation.findById(caseId);
  if (!investigation) return null;
  if (user.role === "ADMIN") return investigation;
  if (investigation.createdBy.toString() === user.id) return investigation;
  if (
    user.role === "REVIEWER" &&
    investigation.assignedReviewers?.some((r) => r.toString() === user.id)
  ) {
    return investigation;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("investigations:view");
    const { id } = await ctx.params;
    await connectDb();

    const investigation = await canAccessCase(user, id);
    if (!investigation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [images, links, events] = await Promise.all([
      ImageAsset.find({ caseId: id }).sort({ createdAt: -1 }).lean(),
      InvestigationLink.find({ caseId: id }).sort({ createdAt: -1 }).lean(),
      AccessEvent.find({ caseId: id }).sort({ timestamp: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      investigation: {
        id: investigation._id.toString(),
        title: investigation.title,
        caseReference: investigation.caseReference,
        description: investigation.description,
        priority: investigation.priority,
        investigationType: investigation.investigationType,
        status: investigation.status,
        locationRequired: investigation.locationRequired,
        maximumViews: investigation.maximumViews,
        consentMessage: investigation.consentMessage,
        notes: investigation.notes,
        aiAnalysis: investigation.aiAnalysis,
        createdAt: investigation.createdAt,
        updatedAt: investigation.updatedAt,
      },
      images: images.map((img) => ({
        id: img._id.toString(),
        originalFilename: img.originalFilename,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        createdAt: img.createdAt,
      })),
      links: links.map((l) => ({
        id: l._id.toString(),
        shortCode: l.shortCode,
        status: l.status,
        expiresAt: l.expiresAt,
        maximumViews: l.maximumViews,
        currentViews: l.currentViews,
        locationRequired: l.locationRequired,
        createdAt: l.createdAt,
        firstAccessAt: l.firstAccessAt,
        lastAccessAt: l.lastAccessAt,
      })),
      events: events.map((e) => ({
        id: e._id.toString(),
        eventType: e.eventType,
        consentStatus: e.consentStatus,
        accuracy: e.accuracy,
        browser: e.browser,
        operatingSystem: e.operatingSystem,
        deviceCategory: e.deviceCategory,
        timestamp: e.timestamp,
        // Never return raw coordinates or IP to client in list
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
