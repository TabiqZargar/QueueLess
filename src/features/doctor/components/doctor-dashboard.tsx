"use client";

import { useRouter } from "next/navigation";
import { QueueWithDetails } from "@/lib/queue/repository";
import { DoctorHeader } from "./doctor-header";
import { CurrentPatientCard } from "./current-patient";
import { UpcomingPatients } from "./upcoming-patients";
import { QueueSummary } from "./queue-summary";
import type { DoctorDashboardData } from "../get-doctor-data";
import { useRealtimeUpdate } from "@/lib/realtime/use-realtime";
import { RealtimeStatus } from "@/components/realtime/realtime-status";
import { Icon } from "@/components/ui/icon";

interface DoctorDashboardProps {
  queues: QueueWithDetails[];
  selectedQueueId: string;
  data: DoctorDashboardData | null;
}

const UNAVAILABLE_STATUSES = ["COMPLETED", "CANCELLED", "NOT_STARTED"] as const;

export function DoctorDashboard({
  queues,
  selectedQueueId,
  data,
}: DoctorDashboardProps) {
  const router = useRouter();
  const realtimeStatus = useRealtimeUpdate(selectedQueueId || null);

  function handleQueueChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/doctor/dashboard?queue=${e.target.value}`);
  }

  const isUnavailable =
    data === null ||
    UNAVAILABLE_STATUSES.includes(
      data.queueStatus as (typeof UNAVAILABLE_STATUSES)[number]
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-headline-xl text-on-surface">Doctor Dashboard</h1>
            <RealtimeStatus status={realtimeStatus} />
          </div>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Who am I serving? Who is next?
          </p>
        </div>
        {queues.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="doctor-queue-select"
              className="text-label-md font-medium text-on-surface"
            >
              Queue
            </label>
            <div className="relative">
              <select
                id="doctor-queue-select"
                value={selectedQueueId}
                onChange={handleQueueChange}
                className="block appearance-none rounded-xl border border-outline bg-white px-4 py-2.5 pr-10 text-sm text-on-surface focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.departmentName ?? queue.id}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                size="sm"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
            </div>
          </div>
        )}
      </div>

      {data && <DoctorHeader queue={data.queue} />}

      {isUnavailable ? (
        <section
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-sm"
          aria-labelledby="doctor-unavailable-heading"
        >
          <Icon name="info" size="xl" className="mx-auto text-outline" />
          <h2
            id="doctor-unavailable-heading"
            className="mt-3 text-headline-md text-on-surface"
          >
            {data
              ? queueUnavailableTitle(data.queueStatus)
              : "This queue is currently unavailable."}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-body-sm text-on-surface-variant">
            This queue is no longer available for consultation operations.
            Select a different queue or wait for staff to reactivate it.
          </p>
        </section>
      ) : (
        <>
          {data.queueStatus === "PAUSED" && (
            <section
              role="status"
              className="rounded-xl border border-warning-200 bg-warning-50 px-6 py-4"
              aria-label="Queue paused"
            >
              <h2 className="text-body-md font-semibold text-warning-800">
                Queue Paused
              </h2>
              <p className="mt-1 text-body-sm text-warning-700">
                The queue is currently paused. Please wait for staff to resume
                operations.
              </p>
            </section>
          )}

          <CurrentPatientCard
            currentPatient={data.currentPatient}
            queueStatus={data.queueStatus}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <UpcomingPatients
                upcoming={data.upcoming}
                queueStatus={data.queueStatus}
              />
            </div>
            <QueueSummary counts={data.counts} />
          </div>
        </>
      )}
    </div>
  );
}

function queueUnavailableTitle(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "This queue has been completed.";
    case "CANCELLED":
      return "This queue has been cancelled.";
    case "NOT_STARTED":
      return "This queue has not started yet.";
    default:
      return "This queue is currently unavailable.";
  }
}