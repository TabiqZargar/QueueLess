import type { AuthUser, LoginRole } from "./types";

/**
 * Development-only mock authentication provider.
 *
 * These users are deterministic and documented on the login page. The session
 * stores only a user id; every lookup goes through this provider, which makes
 * the boundary explicit so a real database-backed provider can replace it
 * without touching the rest of the application.
 *
 * IMPORTANT: The PATIENT user's id intentionally matches a seeded mock patient
 * ("patient-1") so that queue-entry ownership checks work end to end.
 */
export interface MockAuthUser extends AuthUser {
  email: string;
}

export const mockAuthUsers: MockAuthUser[] = [
  {
    id: "patient-1",
    name: "Muhammad Hassan",
    email: "patient@example.com",
    role: "PATIENT",
  },
  {
    id: "user-staff",
    name: "Staff Operator",
    email: "staff@example.com",
    role: "STAFF",
  },
  {
    id: "user-doctor",
    name: "Dr. Ahmed Khan",
    email: "doctor@example.com",
    role: "DOCTOR",
  },
  {
    id: "user-admin",
    name: "System Administrator",
    email: "admin@example.com",
    role: "ADMIN",
  },
];

/**
 * The roles selectable on the development login page. The client never sends
 * arbitrary identities - only one of these role keys, each resolving to the
 * fixed development user above.
 */
export const LOGIN_ROLES: readonly LoginRole[] = [
  "PATIENT",
  "STAFF",
  "DOCTOR",
  "ADMIN",
];

export function getMockUserById(userId: string): MockAuthUser | null {
  return mockAuthUsers.find((u) => u.id === userId) ?? null;
}

export function getMockUserByLoginRole(
  role: LoginRole
): MockAuthUser | null {
  return mockAuthUsers.find((u) => u.role === role) ?? null;
}

export function isLoginRole(value: unknown): value is LoginRole {
  return LOGIN_ROLES.includes(value as LoginRole);
}