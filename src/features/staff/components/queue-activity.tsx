import type { QueueActivityItem } from "../get-staff-data";

export function formatEventTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function QueueActivity({ items }: { items: QueueActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-body-sm text-on-surface-variant">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-outline-variant">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          <span className="text-label-sm tabular-nums text-on-surface-variant/70">
            {formatEventTime(item.timestamp)}
          </span>
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
            {item.label}
          </span>
          {item.token && (
            <span className="font-mono text-label-sm font-medium text-on-surface-variant">
              {item.token}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}