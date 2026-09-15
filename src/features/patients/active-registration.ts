import type { QueueEntry } from "@/types";
import { queueService } from "@/lib/queue/instance";
import type { QueueService } from "@/lib/queue/queue-service";

/**
 * Recovers the auth-scoped patient's active (non-terminal) queue entries from
 * the durable data layer. Browser state (cookies) is never used as the source
 * of truth - the database is authoritative and scoped strictly to the
 * authenticated patient id.
 */
export async function getActiveRegistrationsForUser(
  userId: string,
  service: QueueService = queueService
): Promise<QueueEntry[]> {
  return service.getActiveRegistrationsForPatient(userId);
}

/**
 * Returns the single most recent active registration for the user, or null
 * when the patient has no unresolved journey. Used by landing pages to
 * redirect patients back to the correct status view after login.
 */
export async function getCurrentPatientRegistration(
  userId: string,
  service: QueueService = queueService
): Promise<QueueEntry | null> {
  const registrations = await getActiveRegistrationsForUser(userId, service);
  return registrations[0] ?? null;
}

/**
 * Path for the patient's personal status page, or null when there is no
 * active registration to route to.
 */
export function patientStatusPath(entry: QueueEntry | null): string | null {
  return entry ? `/queue/${entry.queueId}/status` : null;
}