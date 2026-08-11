import { auth } from "@/lib/auth";
import {
  AuthenticationError,
  AuthorizationError,
  hasPermission,
  type Permission,
} from "@/lib/auth/rbac";
import type { SessionUser, UserRole } from "@/types";

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return {
    id: session.user.id,
    email: session.user.email || "",
    name: session.user.name || "",
    role: session.user.role as UserRole,
    emailVerified: Boolean(session.user.emailVerified),
    mfaEnabled: Boolean(session.user.mfaEnabled),
  };
}

export async function requireAuthPermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireSession();
  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError();
  }
  return user;
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
