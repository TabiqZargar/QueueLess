"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationSummary } from "@/lib/notifications/types";
import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/features/notifications/actions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationSummary[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAll, setPendingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const unread = initialUnreadCount;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onPointerDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, close]);

  async function handleMarkRead(id: string) {
    setPendingId(id);
    try {
      await markNotificationAsReadAction(id);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleMarkAll() {
    setPendingAll(true);
    try {
      await markAllNotificationsAsReadAction();
      router.refresh();
    } finally {
      setPendingAll(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex items-center justify-center rounded-xl p-2 text-on-surface-variant hover:bg-surface-container transition-colors focus-ring"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">
          notifications
        </span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="text-sm font-semibold text-on-surface">
              Notifications
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={pendingAll}
                className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {initialNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {initialNotifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          n.readAt
                            ? "text-sm font-medium text-on-surface-variant"
                            : "text-sm font-semibold text-on-surface"
                        }
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {n.message}
                      </p>
                      <p
                        className="mt-1 text-[11px] text-on-surface-variant/60"
                        title={formatTime(n.createdAt)}
                      >
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.readAt ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={pendingId === n.id}
                        aria-label={`Mark "${n.title}" as read`}
                        className="shrink-0 text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                      >
                        {pendingId === n.id ? "…" : "Mark as read"}
                      </button>
                    ) : (
                      <span
                        aria-label="Read"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-outline"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}