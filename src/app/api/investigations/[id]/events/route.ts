import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { AccessEvent } from "@/models/AccessEvent";
import { Investigation } from "@/models/Investigation";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuthPermission("events:view");
    const { id } = await ctx.params;
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || 20),
      100,
    );

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

    const filter: Record<string, unknown> = { caseId: id };
    if (cursor) {
      filter.timestamp = { $lt: new Date(cursor) };
    }

    const events = await AccessEvent.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;

    return NextResponse.json({
      events: page.map((e) => ({
        id: e._id.toString(),
        eventType: e.eventType,
        consentStatus: e.consentStatus,
        accuracy: e.accuracy,
        browser: e.browser,
        operatingSystem: e.operatingSystem,
        deviceCategory: e.deviceCategory,
        country: e.country,
        city: e.city,
        timestamp: e.timestamp,
      })),
      nextCursor: hasMore
        ? page[page.length - 1]?.timestamp?.toISOString()
        : null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
