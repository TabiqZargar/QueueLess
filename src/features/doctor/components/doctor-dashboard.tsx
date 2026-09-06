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
            <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
            <RealtimeStatus status={realtimeStatus} />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Who am I serving? Who is next?
          </p>
        </div>
        {queues.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="doctor-queue-select"
              className="text-sm font-medium text-gray-700"
            >
              Queue
            </label>
            <select
              id="doctor-queue-select"
              value={selectedQueueId}
              onChange={handleQueueChange}
              className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.departmentName ?? queue.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {data && <DoctorHeader queue={data.queue} />}

      {isUnavailable ? (
        <section
          className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm"
          aria-labelledby="doctor-unavailable-heading"
        >
          <h2
            id="doctor-unavailable-heading"
            className="text-lg font-semibold text-gray-900"
          >
            {data ? queueUnavailableTitle(data.queueStatus) : "This queue is currently unavailable."}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            This queue is no longer available for consultation operations.
            Select a different queue or wait for staff to reactivate it.
          </p>
        </section>
      ) : (
        <>
          {data.queueStatus === "PAUSED" && (
            <section
              role="status"
              className="rounded-lg border border-warning-200 bg-warning-50 px-6 py-4"
              aria-label="Queue paused"
            >
              <h2 className="text-sm font-semibold text-warning-800">
                Queue Paused
              </h2>
              <p className="mt-1 text-sm text-warning-700">
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