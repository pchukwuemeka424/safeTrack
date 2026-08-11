const SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
];

export function detectMimeFromSignature(buffer: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
      if (sig.mime === "image/webp") {
        if (
          buffer.length >= 12 &&
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        ) {
          return "image/webp";
        }
        continue;
      }
      return sig.mime;
    }
  }
  return null;
}
