import { NextRequest, NextResponse } from "next/server";
import { processCameraCapture } from "@/lib/location/camera-capture";
import { rateLimitFromRequest, getClientIp } from "@/lib/rate-limit";
import { isValidShortCode } from "@/lib/links/hostname";

const ALLOWED_CONSENT = new Set([
  "GRANTED",
  "DENIED",
  "UNAVAILABLE",
  "TIMEOUT",
]);

export async function POST(req: NextRequest) {
  const rl = rateLimitFromRequest(req, "camera-capture", 40, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const form = await req.formData();
    const shortCode = String(form.get("shortCode") || "")
      .toLowerCase()
      .trim();
    const consentStatus = String(form.get("consentStatus") || "");
    const facingModeRaw = String(form.get("facingMode") || "unknown");
    const facingMode =
      facingModeRaw === "user" || facingModeRaw === "environment"
        ? facingModeRaw
        : "unknown";

    if (!isValidShortCode(shortCode) || !ALLOWED_CONSENT.has(consentStatus)) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 400 },
      );
    }

    if (consentStatus !== "GRANTED") {
      const result = await processCameraCapture({
        shortCode,
        consentStatus: consentStatus as
          | "DENIED"
          | "UNAVAILABLE"
          | "TIMEOUT",
        facingMode,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, captured: false });
    }

    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processCameraCapture({
      shortCode,
      consentStatus: "GRANTED",
      buffer,
      declaredMime: file.type || "image/jpeg",
      facingMode,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      captured: result.captured,
      id: "id" in result ? result.id : undefined,
    });
  } catch (error) {
    console.error("camera-capture failed", error);
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 },
    );
  }
}
