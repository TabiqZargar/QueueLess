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

/**
 * Header notification bell (patient layout). The list of notifications is
 * fetched once on the server (the layout) and passed down; the client only
 * renders it and triggers the standard server actions, which are followed by a
 * `router.refresh()` so the page re-reads authoritative state — the same
 * refresh path used when a realtime queue event arrives.
 */
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
        className="relative rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 focus-ring"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white"
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
          className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
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
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {initialNotifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          n.readAt
                            ? "text-sm font-medium text-gray-600"
                            : "text-sm font-semibold text-gray-900"
                        }
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {n.message}
                      </p>
                      <p
                        className="mt-1 text-[11px] text-gray-400"
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
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300"
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