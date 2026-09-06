"use server";

import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import { createSession, destroySession } from "@/lib/auth/session";
import {
  getMockUserByLoginRole,
  isLoginRole,
} from "@/lib/auth/mock-auth";
import { sanitizeRedirectPath } from "@/lib/auth/page-guard";

/**
 * Development-only authentication actions. A real provider replaces these
 * without changing the session or authorization API.
 */

export interface LoginActionState {
  error?: string;
}

const DEFAULT_HOME: Record<UserRole, string> = {
  PATIENT: "/",
  STAFF: "/staff/dashboard",
  DOCTOR: "/doctor/dashboard",
  ADMIN: "/admin",
};

export async function loginAction(
  _prevState: LoginActionState | undefined,
  formData: FormData
): Promise<LoginActionState> {
  const rawRole = formData.get("role");
  const rawNext = formData.get("next");

  if (!isLoginRole(rawRole)) {
    return { error: "Invalid sign-in option." };
  }

  const user = getMockUserByLoginRole(rawRole);
  if (!user) {
    return { error: "Unable to sign in with the selected option." };
  }

  await createSession(user.id);

  const next = typeof rawNext === "string" ? sanitizeRedirectPath(rawNext) : "/";
  const destination =
    next !== "/" ? next : DEFAULT_HOME[user.role];
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}