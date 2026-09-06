"use client";

import type { RealtimeConnectionState } from "@/lib/realtime/polling-client";

const CONFIG: Record<
  RealtimeConnectionState,
  { label: string; dot: string; text: string }
> = {
  live: {
    label: "Live",
    dot: "bg-success-500",
    text: "text-success-700",
  },
  connecting: {
    label: "Connecting…",
    dot: "bg-gray-300",
    text: "text-gray-500",
  },
  unavailable: {
    label: "Updates unavailable",
    dot: "bg-gray-300",
    text: "text-gray-400",
  },
};

/**
 * Subtle, non-intrusive indicator for realtime connection state. Rendered at
 * page/feature boundaries next to the content the stream refreshes.
 */
export function RealtimeStatus({
  status,
}: {
  status: RealtimeConnectionState;
}) {
  const config = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${config.text}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${config.dot}`}
      />
      {config.label}
    </span>
  );
}