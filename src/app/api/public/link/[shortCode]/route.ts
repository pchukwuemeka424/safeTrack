import { NextRequest, NextResponse } from "next/server";
import { getPublicLinkState, findLinkByShortCode } from "@/lib/links/service";
import { createSignedImageToken } from "@/lib/storage/blob";
import { AccessEvent } from "@/models/AccessEvent";
import { rateLimitFromRequest, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit/write";
import { isValidShortCode } from "@/lib/links/hostname";
import { normalizeShortCode } from "@/lib/links/short-code";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ shortCode: string }> },
) {
  const rl = rateLimitFromRequest(req, "public-link", 60, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { shortCode: raw } = await ctx.params;
  const shortCode = normalizeShortCode(raw);

  if (!isValidShortCode(shortCode)) {
    return NextResponse.json({ status: "UNAVAILABLE" });
  }

  try {
    const state = await getPublicLinkState(shortCode);

    if (state.status === "INVALID") {
      return NextResponse.json({ status: "UNAVAILABLE" });
    }

    if (state.status !== "ACTIVE") {
      return NextResponse.json({ status: state.status });
    }

    const link = await findLinkByShortCode(shortCode);
    if (!link) {
      return NextResponse.json({ status: "UNAVAILABLE" });
    }

    if (link.shortCode !== shortCode) {
      link.shortCode = shortCode;
      await link.save();
    }

    await AccessEvent.create({
      linkId: link._id,
      caseId: link.caseId,
      eventType: "PAGE_VIEW",
      consentStatus: "PENDING",
      userAgent: req.headers.get("user-agent"),
      ipHash: null,
    });

    await writeAuditLog({
      action: "LINK_ACCESSED",
      resourceType: "InvestigationLink",
      resourceId: link._id.toString(),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    const blurToken = await createSignedImageToken(
      link.imageId.toString(),
      "blur",
      300,
    );

    return NextResponse.json({
      status: "ACTIVE",
      shortCode: state.shortCode,
      consentText: state.consentText,
      locationRequired: state.locationRequired,
      allowViewWithoutLocation: state.allowViewWithoutLocation,
      blurImageUrl: `/api/public/image?token=${encodeURIComponent(blurToken)}`,
    });
  } catch {
    return NextResponse.json({ status: "UNAVAILABLE" });
  }
}
