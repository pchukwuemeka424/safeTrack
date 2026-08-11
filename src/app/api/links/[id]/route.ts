import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { InvestigationLink } from "@/models/InvestigationLink";
import { Investigation } from "@/models/Investigation";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("links:revoke");
    const { id } = await ctx.params;
    await connectDb();

    const link = await InvestigationLink.findById(id);
    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const investigation = await Investigation.findById(link.caseId);
    if (
      user.role !== "ADMIN" &&
      investigation?.createdBy.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    link.status = "REVOKED";
    link.revokedAt = new Date();
    await link.save();

    await writeAuditLog({
      actorId: user.id,
      action: "LINK_REVOKED",
      resourceType: "InvestigationLink",
      resourceId: link._id.toString(),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("links:revoke");
    const { id } = await ctx.params;
    const body = await req.json();
    await connectDb();

    const link = await InvestigationLink.findById(id);
    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const investigation = await Investigation.findById(link.caseId);
    if (
      user.role !== "ADMIN" &&
      investigation?.createdBy.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.action === "deactivate") {
      link.status = "INACTIVE";
    } else if (body.action === "expire") {
      link.status = "EXPIRED";
      link.expiresAt = new Date();
    } else if (body.action === "revoke") {
      link.status = "REVOKED";
      link.revokedAt = new Date();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await link.save();
    return NextResponse.json({ ok: true, status: link.status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
