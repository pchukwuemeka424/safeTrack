import { connectDb } from "@/lib/db/connection";
import { AuditLog } from "@/models/AuditLog";
import type { AuditAction } from "@/types";
import { hashValue } from "@/lib/security/encryption";
import { logger } from "@/lib/utils/logger";

interface WriteAuditInput {
  actorId?: string | null;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(input: WriteAuditInput): Promise<void> {
  try {
    await connectDb();
    await AuditLog.create({
      actorId: input.actorId || null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId || null,
      timestamp: new Date(),
      ipHash: input.ip ? hashValue(input.ip) : null,
      userAgent: input.userAgent || null,
      metadata: input.metadata || {},
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      action: input.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
