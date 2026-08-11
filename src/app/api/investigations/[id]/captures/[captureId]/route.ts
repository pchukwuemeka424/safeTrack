import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { CapturedMedia } from "@/models/CapturedMedia";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { readStoredBlob } from "@/lib/storage/blob";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";

async function canAccessCase(
  user: { id: string; role: string },
  investigation: {
    createdBy: { toString(): string };
    assignedReviewers?: Array<{ toString(): string }>;
  },
) {
  if (user.role === "ADMIN") return true;
  if (investigation.createdBy.toString() === user.id) return true;
  if (
    user.role === "REVIEWER" &&
    investigation.assignedReviewers?.some((r) => r.toString() === user.id)
  ) {
    return true;
  }
  return false;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; captureId: string }> },
) {
  try {
    const user = await requireAuthPermission("evidence:view");
    const { id, captureId } = await ctx.params;
    await connectDb();

    const investigation = await Investigation.findById(id);
    if (!investigation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessCase(user, investigation))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const capture = await CapturedMedia.findOne({
      _id: captureId,
      caseId: id,
      consentStatus: "GRANTED",
    });
    if (!capture) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const variant = req.nextUrl.searchParams.get("variant") || "original";
    const key =
      variant === "thumbnail"
        ? capture.thumbnailStorageKey
        : capture.storageKey;

    const data = await readStoredBlob(key);

    await writeAuditLog({
      actorId: user.id,
      action: "EVIDENCE_VIEWED",
      resourceType: "CapturedMedia",
      resourceId: captureId,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: { variant },
    });

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
