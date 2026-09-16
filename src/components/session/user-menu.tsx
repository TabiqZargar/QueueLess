"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { logoutAction } from "@/features/auth/actions";

export function UserMenu({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-xl border border-outline bg-white px-3 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors focus-ring"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">person</span>
        <span className="hidden sm:inline">Sign in</span>
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
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-3 py-1.5 text-sm font-medium text-on-primary-container"
        aria-label={`Signed in as ${user.name}, ${ROLE_LABELS[user.role]}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
        <span className="hidden sm:inline text-xs text-on-primary-container/60">
          {ROLE_LABELS[user.role]}
        </span>
        <span className="sm:hidden text-xs font-medium">{ROLE_LABELS[user.role]}</span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl p-2 text-on-surface-variant hover:bg-surface-container transition-colors focus-ring disabled:opacity-50"
        aria-label="Sign out"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">logout</span>
      </button>
    </div>
  );
}