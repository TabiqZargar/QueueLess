import type { AuthUser } from "@/lib/auth/types";
import type { QueueEntry, QueueEntryStatus } from "@/types";
import type { QueueWithDetails } from "@/lib/queue/repository";

/**
 * Data access required to authorize a realtime subscription. Injected so the
 * rule stays purely testable and independent of the concrete service/repo.
 */
export interface RealtimeAuthorizationDeps {
  getQueueWithDetails(queueId: string): Promise<QueueWithDetails | null>;
  getQueueEntries(queueId: string): Promise<QueueEntry[]>;
}

const ACTIVE_ENTRY_STATUSES: readonly QueueEntryStatus[] = [
  "WAITING",
  "CALLED",
  "IN_CONSULTATION",
];

/**
 * Whether the current user may subscribe to a queue's realtime stream.
 *
 * STAFF and ADMIN may subscribe to any queue. A DOCTOR may subscribe only to
 * queues they serve (matched by queue.doctor.displayName === user.name - the
 * deterministic link available with the mock auth provider). A PATIENT may
 * subscribe only while they have an active entry in the queue; a patient with
 * only terminal/historical entries has nothing left to stream and is denied.
 */
export async function canSubscribeToQueue(
  user: AuthUser,
  queueId: string,
  deps: RealtimeAuthorizationDeps
): Promise<boolean> {
  if (user.role === "STAFF" || user.role === "ADMIN") {
    return true;
  }

  if (user.role === "DOCTOR") {
    const queue = await deps.getQueueWithDetails(queueId);
    return queue?.doctor?.displayName === user.name;
  }

  if (user.role === "PATIENT") {
    const entries = await deps.getQueueEntries(queueId);
    return entries.some(
      (e) =>
        e.patientId === user.id &&
        (ACTIVE_ENTRY_STATUSES as readonly string[]).includes(e.status)
    );
  }

  return false;
}