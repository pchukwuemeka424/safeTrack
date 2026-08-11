import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/models/User";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/lib/validation/schemas";
import { rateLimitFromRequest } from "@/lib/rate-limit";
import { generateToken } from "@/lib/links/short-code";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashValue } from "@/lib/security/encryption";

export async function POST(req: NextRequest) {
  const rl = rateLimitFromRequest(req, "password-reset", 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const action = body.action as "request" | "confirm";

  await connectDb();

  if (action === "request") {
    const parsed = passwordResetRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
    if (user) {
      const token = generateToken(32);
      user.passwordResetToken = hashValue(token);
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendPasswordResetEmail(user.email, token);
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists, a reset email has been sent.",
    });
  }

  if (action === "confirm") {
    const parsed = passwordResetConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await User.findOne({
      passwordResetToken: hashValue(parsed.data.token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    return NextResponse.json({ ok: true, message: "Password updated" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
