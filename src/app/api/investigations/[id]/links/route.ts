import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { ImageAsset } from "@/models/ImageAsset";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { createInvestigationLink } from "@/lib/links/service";
import { writeAuditLog } from "@/lib/audit/write";
import { rateLimitFromRequest, getClientIp } from "@/lib/rate-limit";
import { buildLinkUrl } from "@/lib/links/hostname";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const rl = rateLimitFromRequest(req, "links", 30, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await requireAuthPermission("links:create");
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
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

    let imageId = body.imageId as string | undefined;
    if (!imageId) {
      const latest = await ImageAsset.findOne({ caseId: id })
        .sort({ createdAt: -1 })
        .lean();
      if (!latest) {
        return NextResponse.json(
          { error: "Upload an image before generating a link" },
          { status: 400 },
        );
      }
      imageId = latest._id.toString();
    }

    const image = await ImageAsset.findOne({ _id: imageId, caseId: id });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const link = await createInvestigationLink({
      caseId: id,
      imageId,
      createdBy: user.id,
      investigation,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "LINK_CREATED",
      resourceType: "InvestigationLink",
      resourceId: link.id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { shortCode: link.shortCode },
    });

    return NextResponse.json({
      id: link.id,
      shortCode: link.shortCode,
      url: buildLinkUrl(link.shortCode),
      expiresAt: link.expiresAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
