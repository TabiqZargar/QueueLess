"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { logoutAction } from "@/features/auth/actions";

/**
 * Session-aware header control: shows the signed-in user (name + role) with a
 * sign-out action, or a sign-in link when logged out. Data flows server -> this
 * component; the client never reads the session cookie itself.
 */
export function UserMenu({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-ring"
      >
        Sign in
      </Link>
    );
  }

  async function handleLogout() {
    setPending(true);
    try {
      await logoutAction();
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex items-center gap-2 text-sm text-gray-700"
        aria-label="Signed in"
      >
        <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 sm:flex">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">
          <span className="block text-sm font-medium text-gray-900">
            {user.name}
          </span>
          <span className="block text-xs text-gray-500">
            {ROLE_LABELS[user.role]}
          </span>
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 sm:hidden">
          {ROLE_LABELS[user.role]}
        </span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-ring disabled:opacity-50"
      >
        {pending ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}