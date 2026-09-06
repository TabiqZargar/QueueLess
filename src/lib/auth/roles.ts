import type { UserRole } from "@/types";

/**
 * Centralized role constants. Application code should reference these instead
 * of scattering literal role strings, so the role surface stays explicit.
 */
export const USER_ROLES = {
  PATIENT: "PATIENT",
  STAFF: "STAFF",
  DOCTOR: "DOCTOR",
  ADMIN: "ADMIN",
} as const satisfies Record<UserRole, UserRole>;

export const USER_ROLE_LIST: readonly UserRole[] = [
  USER_ROLES.PATIENT,
  USER_ROLES.STAFF,
  USER_ROLES.DOCTOR,
  USER_ROLES.ADMIN,
];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.PATIENT]: "Patient",
  [USER_ROLES.STAFF]: "Staff",
  [USER_ROLES.DOCTOR]: "Doctor",
  [USER_ROLES.ADMIN]: "Admin",
};

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLE_LIST.includes(value as UserRole);
}