import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { Investigation } from "@/models/Investigation";
import { createInvestigationSchema } from "@/lib/validation/schemas";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write";
import { rateLimitFromRequest, getClientIp } from "@/lib/rate-limit";
import { AuthenticationError, AuthorizationError } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const user = await requireAuthPermission("investigations:view");
    await connectDb();

    const filter =
      user.role === "ADMIN"
        ? {}
        : user.role === "REVIEWER"
          ? {
              $or: [
                { assignedReviewers: user.id },
                { createdBy: user.id },
              ],
            }
          : { createdBy: user.id };

    const investigations = await Investigation.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      investigations: investigations.map((i) => ({
        id: i._id.toString(),
        title: i.title,
        caseReference: i.caseReference,
        status: i.status,
        priority: i.priority,
        investigationType: i.investigationType,
        createdAt: i.createdAt,
        locationRequired: i.locationRequired,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimitFromRequest(req, "investigations", 30, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await requireAuthPermission("investigations:create");
    const body = await req.json();
    const parsed = createInvestigationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid investigation data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectDb();

    const existing = await Investigation.findOne({
      caseReference: parsed.data.caseReference,
    });
    if (existing) {
      return NextResponse.json(
        { error: "Case reference already exists" },
        { status: 409 },
      );
    }

    const investigation = await Investigation.create({
      ...parsed.data,
      consentMessage:
        parsed.data.consentMessage ||
        "OALS is requesting your current location because this investigation link has been configured to require location verification before the image can be viewed. Your location will be recorded only if you allow your browser to provide it.",
      subject: { label: parsed.data.subjectLabel },
      createdBy: user.id,
      status: "ACTIVE",
    });

    await writeAuditLog({
      actorId: user.id,
      action: "CASE_CREATED",
      resourceType: "Investigation",
      resourceId: investigation._id.toString(),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      id: investigation._id.toString(),
      caseReference: investigation.caseReference,
    });
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return toErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create investigation" }, { status: 500 });
  }
}
