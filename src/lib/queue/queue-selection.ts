import type { QueueWithDetails } from "./repository";

/**
 * Resolves which queue a dashboard page should operate on from an optional
 * user-supplied queue id (e.g. `?queue=queue-2`) and the available queues.
 *
 * Falls back to the most recently updated ACTIVE queue, then any queue, then
 * empty. The user-supplied id is only honored when it names a real queue so
 * a query parameter can never select a queue that does not exist.
 */
export function resolveSelectedQueueId(
  queues: QueueWithDetails[],
  requested?: string
): string {
  if (requested && queues.some((q) => q.id === requested)) {
    return requested;
  }

  const active = [...queues]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .find((q) => q.status === "ACTIVE");

  return active?.id ?? queues[0]?.id ?? "";
}