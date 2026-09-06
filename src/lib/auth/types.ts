import type { UserRole } from "@/types";

/**
 * The authenticated identity surfaced to application code.
 *
 * This is deliberately minimal and provider-agnostic: swapping the mock auth
 * provider for a real database-backed user store must not change how
 * application code reads the current user.
 */
export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

/**
 * The resolved session for a request. Always carries exactly one user.
 */
export interface Session {
  user: AuthUser;
}

/**
 * The set of roles that can be selected on the development login page.
 * Client-submitted role values are validated against this allowlist on the
 * server before any session is created.
 */
export type LoginRole = Extract<UserRole, "PATIENT" | "STAFF" | "DOCTOR" | "ADMIN">;