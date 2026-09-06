import type { UserRole } from "@/types";
import type { AuthUser, Session } from "./types";
import { getMockUserById } from "./mock-auth";
import { readSessionUserId } from "./session";
import { AuthenticationError, AuthorizationError } from "./errors";

/**
 * Resolves the current session from the request cookies.
 * Returns null when there is no usable session (logged out / unknown user).
 */
export async function getSession(): Promise<Session | null> {
  const userId = await readSessionUserId();
  const user = userId ? getMockUserById(userId) : null;
  return user ? { user: authUserFrom(user) } : null;
}

/**
 * Returns the authenticated user or null when not signed in.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Requires an authenticated session or throws AuthenticationError.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}

/**
 * Requires an authenticated session whose role matches exactly.
 * Throws AuthorizationError when authenticated but unauthorized.
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new AuthorizationError();
  }
  return user;
}

/**
 * Requires an authenticated session whose role is among the allowed set.
 * Throws AuthorizationError when authenticated but unauthorized.
 */
export async function requireAnyRole(
  roles: readonly UserRole[]
): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthorizationError();
  }
  return user;
}

/**
 * Guards object-level ownership (e.g. Patient A may not act on Patient B's
 * queue entry). Throws AuthorizationError when the ids do not match.
 */
export function ensureOwnership(
  userId: string,
  ownerId: string,
  _description?: string
): void {
  if (userId !== ownerId) {
    throw new AuthorizationError();
  }
}

function authUserFrom(user: AuthUser): AuthUser {
  return { id: user.id, name: user.name, role: user.role };
}