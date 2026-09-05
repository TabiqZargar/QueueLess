"use client";

import { useRouter } from "next/navigation";
import type { QueueWithDetails } from "@/lib/queue/repository";

interface QueueSelectorProps {
  queues: QueueWithDetails[];
  selectedQueueId: string;
}

export function QueueSelector({
  queues,
  selectedQueueId,
}: QueueSelectorProps) {
  const router = useRouter();

  return (
    <div>
      <label
        htmlFor="staff-queue-select"
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        Active queue
      </label>
      <select
        id="staff-queue-select"
        value={selectedQueueId}
        onChange={(e) => router.push(`/staff/dashboard?queue=${e.target.value}`)}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {queues.map((q) => (
          <option key={q.id} value={q.id}>
            {q.departmentName ?? "Queue"} — {q.doctor?.displayName ?? "Doctor"}
          </option>
        ))}
      </select>
    </div>
  );
}