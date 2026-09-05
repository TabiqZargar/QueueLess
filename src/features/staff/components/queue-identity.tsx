import type { QueueWithDetails } from "@/lib/queue/repository";
import {
  QueueStatusBadge,
  queueStatusText,
} from "@/components/queue-status-badge";

export function QueueIdentity({ queue }: { queue: QueueWithDetails }) {
  return (
    <section
      aria-label="Queue identity"
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {queue.clinicName ?? "Clinic"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {queue.departmentName ?? queue.id}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {queue.doctor?.displayName ?? "Doctor"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Queue {queue.id}</p>
        </div>
        <div className="text-right">
          <QueueStatusBadge status={queue.status} />
          <p className="mt-2 text-xs text-gray-500">
            {queueStatusText(queue.status)} queue
          </p>
        </div>
      </div>
    </section>
  );
}