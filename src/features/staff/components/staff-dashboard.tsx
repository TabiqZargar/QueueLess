"use client";

import type { QueueWithDetails } from "@/lib/queue/repository";
import type { StaffDashboardData } from "../get-staff-data";
import { QueueSelector } from "./queue-selector";
import { QueueIdentity } from "./queue-identity";
import { QueueStats } from "./queue-stats";
import { CurrentPatientPanel } from "./current-patient";
import { WaitingQueueCard } from "./waiting-queue";
import { QueueControlsCard } from "./queue-controls";
import { QueueActivity } from "./queue-activity";
import { useRealtimeUpdate } from "@/lib/realtime/use-realtime";
import { RealtimeStatus } from "@/components/realtime/realtime-status";

interface StaffDashboardProps {
  queues: QueueWithDetails[];
  selectedQueueId: string;
  data: StaffDashboardData | null;
}

export function StaffDashboard({
  queues,
  selectedQueueId,
  data,
}: StaffDashboardProps) {
  const realtimeStatus = useRealtimeUpdate(selectedQueueId || null);

  if (!data) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-headline-xl text-on-surface">Staff Dashboard</h1>
          <RealtimeStatus status={realtimeStatus} />
        </div>
        <p className="mt-2 text-body-md text-on-surface-variant">
          {queues.length === 0
            ? "No queues have been created yet."
            : "Select a queue from the list to get started."}
        </p>
        {queues.length > 0 && (
          <div className="mt-6">
            <QueueSelector queues={queues} selectedQueueId={selectedQueueId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-headline-xl text-on-surface">Staff Dashboard</h1>
            <RealtimeStatus status={realtimeStatus} />
          </div>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Operate the queue, manage patients, and track activity.
          </p>
        </div>
        <div className="w-full lg:w-80">
          <QueueSelector queues={queues} selectedQueueId={selectedQueueId} />
        </div>
      </div>

      <QueueIdentity queue={data.queue} />

      <QueueStats data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentPatientPanel
          currentPatient={data.currentPatient}
          estimatedWaitMinutes={data.stats.estimatedWaitMinutes}
        />
        <QueueControlsCard queueId={data.queue.id} queueStatus={data.queueStatus} />
      </div>

      <WaitingQueueCard
        waitList={data.waitList}
        queueId={data.queue.id}
        queueActive={data.queueStatus === "ACTIVE"}
      />

      <section
        className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
        aria-labelledby="queue-activity-heading"
      >
        <div className="border-b border-outline-variant px-6 py-4">
          <h2
            id="queue-activity-heading"
            className="text-headline-sm text-on-surface"
          >
            Queue Activity
          </h2>
        </div>
        <div className="px-6 py-4">
          <QueueActivity items={data.activity} />
        </div>
      </section>
    </div>
  );
}