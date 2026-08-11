import { describe, it, expect } from "vitest";
import {
  extractShortCodeFromHost,
  isValidShortCode,
  buildLinkUrl,
} from "@/lib/links/hostname";
import { generateShortCode } from "@/lib/links/short-code";
import { encrypt, decrypt, encryptCoordinates, decryptCoordinates } from "@/lib/security/encryption";
import { detectMimeFromSignature, validateImageUpload } from "@/lib/storage/image";
import { hasPermission } from "@/lib/auth/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { analyzeInvestigation } from "@/lib/ai/analyze";

describe("hostname short-code extraction", () => {
  it("extracts code from wildcard subdomain", () => {
    expect(extractShortCodeFromHost("x7k29.oals.online")).toBe("x7k29");
  });

  it("returns null for root and app hosts", () => {
    expect(extractShortCodeFromHost("oals.online")).toBeNull();
    expect(extractShortCodeFromHost("app.oals.online")).toBeNull();
    expect(extractShortCodeFromHost("www.oals.online")).toBeNull();
  });

  it("supports localhost development subdomains", () => {
    expect(extractShortCodeFromHost("abc123.localhost:3000")).toBe("abc123");
    expect(extractShortCodeFromHost("localhost:3000")).toBeNull();
  });

  it("validates short code format", () => {
    expect(isValidShortCode("x7k29")).toBe(true);
    expect(isValidShortCode("../etc")).toBe(false);
  });

  it("builds link URLs", () => {
    const url = buildLinkUrl("x7k29");
    expect(url).toContain("x7k29.");
  });
});

describe("short-code generation", () => {
  it("generates unique non-sequential codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateShortCode(10)));
    expect(codes.size).toBe(50);
  });
});

describe("encryption", () => {
  it("round-trips plaintext", () => {
    const cipher = encrypt("sensitive");
    expect(cipher).not.toContain("sensitive");
    expect(decrypt(cipher)).toBe("sensitive");
  });

  it("encrypts coordinates", () => {
    const payload = encryptCoordinates(51.5, -0.12);
    const coords = decryptCoordinates(payload);
    expect(coords.lat).toBeCloseTo(51.5);
    expect(coords.lng).toBeCloseTo(-0.12);
  });
});

describe("image validation", () => {
  it("detects JPEG signature", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectMimeFromSignature(buf)).toBe("image/jpeg");
  });

  it("rejects mismatched MIME", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = validateImageUpload(buf, "image/png");
    expect(result.ok).toBe(false);
  });
});

describe("RBAC", () => {
  it("allows investigator to create cases", () => {
    expect(hasPermission("INVESTIGATOR", "investigations:create")).toBe(true);
  });

  it("denies reviewer user management", () => {
    expect(hasPermission("REVIEWER", "users:manage")).toBe(false);
  });

  it("allows admin audit access", () => {
    expect(hasPermission("ADMIN", "audit:view")).toBe(true);
  });
});

describe("rate limiting", () => {
  it("blocks after limit", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).success).toBe(true);
    }
    expect(rateLimit(key, 3, 60_000).success).toBe(false);
  });
});

describe("AI analysis", () => {
  it("never claims criminal confirmation and requires review", async () => {
    const result = await analyzeInvestigation({
      title: "Test",
      description: "Case notes",
      investigationType: "SAFEGUARDING",
      priority: "HIGH",
      duplicateChecksumCount: 1,
    });
    expect(result.disclaimer).toContain("must not be treated as proof");
    expect(result.humanReviewStatus).toBe("PENDING_REVIEW");
    expect(JSON.stringify(result)).not.toMatch(/CRIMINAL CONFIRMED/i);
  });
});
