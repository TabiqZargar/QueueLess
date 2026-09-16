import { QueueWithDetails } from "@/lib/queue/repository";
import { QueueStatusBadge } from "@/components/queue-status-badge";

interface DoctorHeaderProps {
  queue: QueueWithDetails;
}

/**
 * Compact "at a glance" identity bar: doctor, department, clinic and
 * live queue status. Uses hydrated queue details only - no hardcoded data.
 */
export function DoctorHeader({ queue }: DoctorHeaderProps) {
  return (
    <section
      className="rounded-xl border border-outline-variant bg-surface-container-lowest px-6 py-4 shadow-sm"
      aria-label="Queue identity"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label-eyebrow text-on-surface-variant">
            {queue.clinicName ?? "Clinic"}
          </p>
          <h2 className="mt-1 text-headline-md text-on-surface">
            {queue.doctor?.displayName ?? "Unknown doctor"}
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {queue.departmentName ?? "Unknown department"}
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant/60">
            Queue {queue.id}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <QueueStatusBadge status={queue.status} />
        </div>
      </div>
    </section>
  );
}