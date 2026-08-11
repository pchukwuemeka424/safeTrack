import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { CapturedMedia } from "@/models/CapturedMedia";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("evidence:view");
    const { id } = await ctx.params;
    await connectDb();

    const investigation = await Investigation.findById(id);
    if (!investigation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      user.role !== "ADMIN" &&
      investigation.createdBy.toString() !== user.id &&
      !(
        user.role === "REVIEWER" &&
        investigation.assignedReviewers?.some((r) => r.toString() === user.id)
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Show all consented captures for the case (including past retention window
    // so investigators can still review saved stills while blobs remain).
    const captures = await CapturedMedia.find({
      caseId: id,
      consentStatus: "GRANTED",
    })
      .sort({ capturedAt: -1 })
      .limit(200)
      .lean();

    await writeAuditLog({
      actorId: user.id,
      action: "EVIDENCE_VIEWED",
      resourceType: "CapturedMedia",
      resourceId: id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { count: captures.length },
    });

    const items = captures.map((c) => ({
      id: c._id.toString(),
      facingMode: c.facingMode,
      width: c.width,
      height: c.height,
      sizeBytes: c.sizeBytes,
      capturedAt: c.capturedAt,
      deviceCategory: c.deviceCategory,
      browser: c.browser,
      operatingSystem: c.operatingSystem,
      retentionExpiresAt: c.retentionExpiresAt,
      thumbnailUrl: `/api/investigations/${id}/captures/${c._id.toString()}?variant=thumbnail`,
      imageUrl: `/api/investigations/${id}/captures/${c._id.toString()}?variant=original`,
    }));

    return NextResponse.json({ captures: items });
  } catch (error) {
    return toErrorResponse(error);
  }
}
