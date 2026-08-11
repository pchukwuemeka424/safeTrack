import type { UserRole } from "@/types";

const permissions = {
  ADMIN: [
    "users:manage",
    "users:view",
    "settings:manage",
    "audit:view",
    "investigations:create",
    "investigations:view",
    "investigations:view_all",
    "investigations:update",
    "investigations:delete",
    "links:create",
    "links:revoke",
    "links:view",
    "events:view",
    "locations:view",
    "evidence:view",
    "evidence:upload",
    "ai:run",
    "ai:review",
    "reports:view",
    "admin:access",
  ],
  INVESTIGATOR: [
    "investigations:create",
    "investigations:view",
    "investigations:update",
    "links:create",
    "links:revoke",
    "links:view",
    "events:view",
    "locations:view",
    "evidence:view",
    "evidence:upload",
    "ai:run",
    "reports:view",
  ],
  REVIEWER: [
    "investigations:view",
    "events:view",
    "locations:view",
    "evidence:view",
    "ai:review",
    "reports:view",
  ],
} as const satisfies Record<UserRole, readonly string[]>;

export type Permission = (typeof permissions)[UserRole][number];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (permissions[role] as readonly string[]).includes(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}

export class AuthorizationError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthenticationError";
  }
}
