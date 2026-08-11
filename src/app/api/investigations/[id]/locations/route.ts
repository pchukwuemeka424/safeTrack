import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { LocationEvent } from "@/models/LocationEvent";
import { Investigation } from "@/models/Investigation";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { decrypt, decryptCoordinates } from "@/lib/security/encryption";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("locations:view");
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

    const events = await LocationEvent.find({
      caseId: id,
      retentionExpiresAt: { $gt: new Date() },
    })
      .sort({ capturedAt: -1 })
      .limit(100)
      .lean();

    await writeAuditLog({
      actorId: user.id,
      action: "EVIDENCE_VIEWED",
      resourceType: "LocationEvent",
      resourceId: id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { count: events.length },
    });

    return NextResponse.json({
      locations: events.map((e) => {
        const coords = decryptCoordinates(e.encryptedCoordinates);
        let address: string | null = null;
        if (e.encryptedAddress) {
          try {
            address = decrypt(e.encryptedAddress);
          } catch {
            address = null;
          }
        }
        return {
          id: e._id.toString(),
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: e.accuracy,
          address,
          city: e.city ?? null,
          country: e.country ?? null,
          capturedAt: e.capturedAt,
          consentStatus: e.consentStatus,
        };
      }),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
