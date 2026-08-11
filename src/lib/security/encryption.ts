import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { env } from "@/lib/utils/env";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const key = env.encryptionKey;
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }
  return createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptCoordinates(lat: number, lng: number): string {
  return encrypt(JSON.stringify({ lat, lng }));
}

export function decryptCoordinates(payload: string): { lat: number; lng: number } {
  return JSON.parse(decrypt(payload)) as { lat: number; lng: number };
}
