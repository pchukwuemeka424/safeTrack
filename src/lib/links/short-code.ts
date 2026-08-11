import { customAlphabet } from "nanoid";
import { randomBytes } from "crypto";

/** Lowercase only — hostnames are case-insensitive and browsers send lowercase. */
const alphabet = "23456789abcdefghijkmnopqrstuvwxyz";

/** Cryptographically secure short codes (~52+ bits for 10 chars from this alphabet). */
export function generateShortCode(length = 10): string {
  const base = customAlphabet(alphabet, length)();
  const extra = randomBytes(4).toString("hex").slice(0, 2);
  return `${base.slice(0, length - 2)}${extra}`.toLowerCase();
}

export function normalizeShortCode(code: string): string {
  return code.trim().toLowerCase();
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export const generateId = customAlphabet(alphabet, 8);
