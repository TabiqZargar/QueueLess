import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import type { AuthUser } from "./types";
import { getCurrentUser } from "./authorization";

/**
 * Route protection helpers for server components (layouts / pages).
 *
 * Guards run on the server and are authoritative: an unauthenticated request
 * is redirected to the login page preserving the destination (next), and an
 * authenticated-but-unauthorized request returns a forbidden result the caller
 * renders as a 403-style screen - never an empty dashboard.
 */
export type PageGuard =
  | { status: "ok"; user: AuthUser }
  | { status: "forbidden" };

/**
 * Validates a redirect destination the client may have supplied. Only same-site
 * relative paths are allowed to prevent open redirects.
 */
export function sanitizeRedirectPath(value: string): string {
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\n") || value.includes("\r")) return "/";
  return value;
}

/**
 * Guards a page for the given roles. Redirects to the login page when the
 * request is unauthenticated, returns "forbidden" otherwise.
 */
export async function guardPage(
  roles: readonly UserRole[],
  currentPath: string
): Promise<PageGuard> {
  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(sanitizeRedirectPath(currentPath));
    redirect(`/login?next=${next}`);
  }
  if (!roles.includes(user.role)) {
    return { status: "forbidden" };
  }
  return { status: "ok", user };
}