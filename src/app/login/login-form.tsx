"use client";

import { useState } from "react";
import Link from "next/link";
import {
  loginAction,
} from "@/features/auth/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { LoginRole } from "@/lib/auth/types";

const LOGIN_OPTIONS: Array<{
  role: LoginRole;
  description: string;
}> = [
  {
    role: "PATIENT",
    description: "Join a queue and track your status",
  },
  {
    role: "STAFF",
    description: "Oversee queue operations",
  },
  {
    role: "DOCTOR",
    description: "Manage consultations",
  },
  {
    role: "ADMIN",
    description: "Clinic administration",
  },
];

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  async function handleLogin(role: LoginRole) {
    setPendingRole(role);
    setError(undefined);
    try {
      const formData = new FormData();
      formData.set("role", role);
      if (next) formData.set("next", next);
      const result = await loginAction(undefined, formData);
      setError(result?.error);
    } finally {
      setPendingRole(null);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      {LOGIN_OPTIONS.map((option) => (
        <button
          key={option.role}
          type="button"
          onClick={() => handleLogin(option.role)}
          disabled={pendingRole !== null}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 focus-ring"
        >
          <span>
            <span className="block font-medium text-gray-900">
              Continue as {ROLE_LABELS[option.role]}
            </span>
            <span className="mt-0.5 block text-sm text-gray-500">
              {option.description}
            </span>
          </span>
          <span className="text-sm font-medium text-primary-600">
            {pendingRole === option.role ? "Signing in..." : "Sign in →"}
          </span>
        </button>
      ))}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
        >
          {error}
        </div>
      )}

      <div className="pt-2 text-center text-sm">
        <Link
          href="/"
          className="text-primary-600 underline hover:text-primary-700 focus-ring rounded"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}