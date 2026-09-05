"use client";

import type { QueueWithDetails } from "@/lib/queue/repository";
import type { StaffDashboardData } from "../get-staff-data";
import { QueueSelector } from "./queue-selector";
import { QueueIdentity } from "./queue-identity";
import { QueueStats } from "./queue-stats";
import { CurrentPatientPanel } from "./current-patient";
import { WaitingQueueCard } from "./waiting-queue";

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
  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="mt-2 text-gray-600">
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
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Operate the queue, manage patients, and track activity.
          </p>
        </div>
        <QueueSelector queues={queues} selectedQueueId={selectedQueueId} />
      </div>

      <QueueIdentity queue={data.queue} />

      <QueueStats data={data} />

      <CurrentPatientPanel
        currentPatient={data.currentPatient}
        estimatedWaitMinutes={data.stats.estimatedWaitMinutes}
      />

      <WaitingQueueCard
        waitList={data.waitList}
        queueId={data.queue.id}
        queueActive={data.queueStatus === "ACTIVE"}
      />
    </div>
  );
}