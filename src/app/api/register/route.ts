import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/models/User";
import { registerSchema } from "@/lib/validation/schemas";
import { rateLimitFromRequest } from "@/lib/rate-limit";
import { generateToken } from "@/lib/links/short-code";
import { sendVerificationEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit/write";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = rateLimitFromRequest(req, "register", 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration data" },
        { status: 400 },
      );
    }

    await connectDb();
    const existing = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    });
    if (existing) {
      // Generic response to avoid email enumeration
      return NextResponse.json({
        ok: true,
        message: "If the email is available, an account has been created.",
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const emailVerificationToken = generateToken(32);

    const user = await User.create({
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash,
      role: "INVESTIGATOR",
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await sendVerificationEmail(user.email, emailVerificationToken);
    await writeAuditLog({
      actorId: user._id.toString(),
      action: "USER_CREATED",
      resourceType: "User",
      resourceId: user._id.toString(),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      message: "If the email is available, an account has been created.",
    });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
