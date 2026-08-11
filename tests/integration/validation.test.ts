import { describe, it, expect } from "vitest";
import { createInvestigationSchema, locationConsentSchema } from "@/lib/validation/schemas";

describe("validation schemas", () => {
  it("accepts valid investigation payload", () => {
    const parsed = createInvestigationSchema.safeParse({
      title: "Safeguarding case",
      caseReference: "CASE-2026-001",
      investigationType: "SAFEGUARDING",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects criminal-style case refs that are empty", () => {
    const parsed = createInvestigationSchema.safeParse({
      title: "x",
      caseReference: "!!",
      investigationType: "OTHER",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires coordinates when consent is granted", () => {
    const parsed = locationConsentSchema.safeParse({
      shortCode: "x7k29abcde",
      consentStatus: "GRANTED",
      latitude: 51.5,
      longitude: -0.1,
      accuracy: 18,
    });
    expect(parsed.success).toBe(true);
  });
});
