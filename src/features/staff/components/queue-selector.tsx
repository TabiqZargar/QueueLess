"use client";

import { useRouter } from "next/navigation";
import type { QueueWithDetails } from "@/lib/queue/repository";
import { Icon } from "@/components/ui/icon";

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
        className="mb-1 block text-label-md font-medium text-on-surface"
      >
        Active queue
      </label>
      <div className="relative">
        <select
          id="staff-queue-select"
          value={selectedQueueId}
          onChange={(e) => router.push(`/staff/dashboard?queue=${e.target.value}`)}
          className="block w-full appearance-none rounded-xl border border-outline bg-white px-4 py-2.5 pr-10 text-sm text-on-surface focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.departmentName ?? "Queue"} — {q.doctor?.displayName ?? "Doctor"}
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
  );
}