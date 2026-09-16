import type { QueueWithDetails } from "@/lib/queue/repository";
import {
  QueueStatusBadge,
  queueStatusText,
} from "@/components/queue-status-badge";

export function QueueIdentity({ queue }: { queue: QueueWithDetails }) {
  return (
    <section
      aria-label="Queue identity"
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label-eyebrow text-on-surface-variant">
            {queue.clinicName ?? "Clinic"}
          </p>
          <h2 className="mt-1 text-headline-lg text-on-surface">
            {queue.departmentName ?? queue.id}
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {queue.doctor?.displayName ?? "Doctor"}
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant/60">
            Queue {queue.id}
          </p>
        </div>
        <div className="text-right">
          <QueueStatusBadge status={queue.status} />
          <p className="mt-2 text-label-sm text-on-surface-variant">
            {queueStatusText(queue.status)} queue
          </p>
        </div>
      </div>
    </section>
  );
}