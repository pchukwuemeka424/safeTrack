import mongoose from "mongoose";
import { env } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

declare global {
  var mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectDb(): Promise<typeof mongoose> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (cached.conn) {
    // Recover if the cached connection dropped
    if (mongoose.connection.readyState === 1) return cached.conn;
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.mongodbUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        // Prefer IPv4 — avoids flaky SRV/IPv6 paths on some local networks
        family: 4,
      })
      .then((m) => {
        logger.info("MongoDB connected");
        return m;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    throw error;
  }
}
