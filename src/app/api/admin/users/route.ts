import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/models/User";
import { requireAuthPermission, toErrorResponse } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";
import type { UserRole } from "@/types";

export async function GET() {
  try {
    await requireAuthPermission("users:view");
    await connectDb();
    const users = await User.find()
      .select("-passwordHash -mfaSecret -passwordResetToken -emailVerificationToken")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        emailVerified: u.emailVerified,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAuthPermission("users:manage");
    const body = await req.json();
    await connectDb();

    const user = await User.findById(body.userId);
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.role) {
      const role = body.role as UserRole;
      if (!["ADMIN", "INVESTIGATOR", "REVIEWER"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      user.role = role;
      await writeAuditLog({
        actorId: actor.id,
        action: "USER_ROLE_CHANGED",
        resourceType: "User",
        resourceId: user._id.toString(),
        ip: getClientIp(req),
        metadata: { role },
      });
    }

    if (typeof body.isActive === "boolean") {
      user.isActive = body.isActive;
      if (!body.isActive) {
        await writeAuditLog({
          actorId: actor.id,
          action: "USER_SUSPENDED",
          resourceType: "User",
          resourceId: user._id.toString(),
          ip: getClientIp(req),
        });
      }
    }

    await user.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
