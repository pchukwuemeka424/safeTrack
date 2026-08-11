function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  rootDomain: optional("NEXT_PUBLIC_ROOT_DOMAIN", "localhost:3000"),
  mongodbUri: optional("MONGODB_URI", ""),
  authSecret: optional("AUTH_SECRET", "dev-secret-change-me-in-production-32b"),
  encryptionKey: optional(
    "ENCRYPTION_KEY",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  ),
  blobToken: optional("BLOB_READ_WRITE_TOKEN"),
  mapProvider: optional("MAP_PROVIDER", "mapbox") as "mapbox" | "google",
  mapboxToken: optional("MAPBOX_TOKEN"),
  publicMapboxToken: optional("NEXT_PUBLIC_MAPBOX_TOKEN"),
  googleMapsApiKey: optional("GOOGLE_MAPS_API_KEY"),
  rapidApiKey: optional("RAPIDAPI_KEY"),
  rapidApiGooglePlacesHost: optional(
    "RAPIDAPI_GOOGLE_PLACES_HOST",
    "google-map-places-new-v2.p.rapidapi.com",
  ),
  emailProvider: optional("EMAIL_PROVIDER", "resend"),
  resendApiKey: optional("RESEND_API_KEY"),
  emailFrom: optional("EMAIL_FROM", "OALS <noreply@mylos.cyou>"),
  storeRawIp: optional("STORE_RAW_IP", "false") === "true",
  defaultRetentionDays: Number(optional("DEFAULT_RETENTION_DAYS", "7")),
  maxUploadBytes: Number(optional("MAX_UPLOAD_BYTES", String(10 * 1024 * 1024))),
  rateLimitWindowMs: Number(optional("RATE_LIMIT_WINDOW_MS", "900000")),
  rateLimitMaxRequests: Number(optional("RATE_LIMIT_MAX_REQUESTS", "100")),
  aiModuleEnabled: optional("AI_MODULE_ENABLED", "true") === "true",
  openaiApiKey: optional("OPENAI_API_KEY"),
  signedImageTtlSeconds: Number(optional("SIGNED_IMAGE_TTL_SECONDS", "60")),
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",
};

export function assertProductionEnv() {
  if (!env.isProd) return;
  required("MONGODB_URI");
  required("AUTH_SECRET");
  required("ENCRYPTION_KEY");
}
