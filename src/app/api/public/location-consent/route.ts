import { NextRequest, NextResponse } from "next/server";
import { locationConsentSchema } from "@/lib/validation/schemas";
import { processLocationConsent } from "@/lib/location/consent";
import { rateLimitFromRequest, getClientIp } from "@/lib/rate-limit";
import { isValidShortCode } from "@/lib/links/hostname";

export async function POST(req: NextRequest) {
  const rl = rateLimitFromRequest(req, "location-consent", 30, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = locationConsentSchema.safeParse(body);
    if (!parsed.success || !isValidShortCode(parsed.data.shortCode)) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 400 },
      );
    }

    if (
      parsed.data.consentStatus === "GRANTED" &&
      (parsed.data.latitude == null ||
        parsed.data.longitude == null ||
        parsed.data.accuracy == null)
    ) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 400 },
      );
    }

    const result = await processLocationConsent({
      ...parsed.data,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      unlocked: result.unlocked,
      consentStatus: result.consentStatus,
      imageUrl: result.imageToken
        ? `/api/public/image?token=${encodeURIComponent(result.imageToken)}`
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to process request" },
      { status: 500 },
    );
  }
}
