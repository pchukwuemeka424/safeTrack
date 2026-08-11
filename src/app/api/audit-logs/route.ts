import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { AuditLog } from "@/models/AuditLog";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthPermission("audit:view");
    await connectDb();

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit") || 50),
      200,
    );
    const cursor = req.nextUrl.searchParams.get("cursor");

    const filter: Record<string, unknown> = {};
    if (cursor) {
      filter.timestamp = { $lt: new Date(cursor) };
    }

    // Investigators without admin can only see their own audit trail via a separate path;
    // this endpoint requires audit:view (ADMIN).
    void user;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = logs.length > limit;
    const page = hasMore ? logs.slice(0, limit) : logs;

    return NextResponse.json({
      logs: page.map((l) => ({
        id: l._id.toString(),
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        actorId: l.actorId?.toString() || null,
        timestamp: l.timestamp,
        metadata: l.metadata,
      })),
      nextCursor: hasMore
        ? page[page.length - 1]?.timestamp?.toISOString()
        : null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
