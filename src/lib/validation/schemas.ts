import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createInvestigationSchema = z.object({
  title: z.string().min(3).max(200),
  caseReference: z.string().min(3).max(64).regex(/^[A-Za-z0-9\-_]+$/),
  description: z.string().max(5000).optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  investigationType: z.enum([
    "SAFEGUARDING",
    "MISSING_PERSON",
    "DIGITAL_INVESTIGATION",
    "SECURITY_INCIDENT",
    "OTHER",
  ]),
  locationRequired: z.boolean().default(true),
  linkExpiryHours: z.number().int().min(1).max(720).default(72),
  maximumViews: z.number().int().min(1).max(100).default(1),
  consentMessage: z.string().min(20).max(1000).optional(),
  allowViewWithoutLocation: z.boolean().default(false),
  subjectLabel: z
    .enum([
      "PERSON_OF_INTEREST",
      "SUBJECT",
      "WATCHLIST_REFERENCE",
      "INVESTIGATION_SUBJECT",
    ])
    .default("INVESTIGATION_SUBJECT"),
  notes: z.string().max(5000).optional().default(""),
});

export const locationConsentSchema = z.object({
  shortCode: z.string().min(4).max(32),
  consentStatus: z.enum(["GRANTED", "DENIED", "UNAVAILABLE", "TIMEOUT"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).max(100000).optional(),
  timestamp: z.number().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});
