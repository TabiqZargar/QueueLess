import { formatQueueToken } from "@/lib/utils";
import { NotificationType } from "./types";

/**
 * Human-readable templates for each notification type.
 *
 * This layer is intentionally separate from the policy so copy can change
 * without touching decision logic. Messages never embed internal identifiers
 * (queue/entry/user ids) — a notification text must be safe to render and
 * safe to hand to an external provider later.
 */

export function notificationTitle(type: NotificationType): string {
  switch (type) {
    case "QUEUE_JOINED":
      return "Queued successfully";
    case "TURN_APPROACHING":
      return "Your turn is near";
    case "PATIENT_CALLED":
      return "You're being called";
    case "CONSULTATION_STARTED":
      return "Consultation started";
    case "QUEUE_COMPLETED":
      return "Queue completed";
    case "QUEUE_CANCELLED":
      return "Queue cancelled";
    case "QUEUE_PAUSED":
      return "Queue temporarily paused";
    case "QUEUE_RESUMED":
      return "Queue resumed";
    case "NO_SHOW":
      return "Missed your turn";
  }
}

export function formatTurnApproachingMessage(patientsAhead: number): string {
  const count = Math.max(patientsAhead, 0);
  return count === 1
    ? "There is 1 patient ahead of you. Please be ready."
    : `There are ${count} patients ahead of you. Please be ready.`;
}

export function formatQueueJoinedMessage(
  tokenNumber: number,
  doctorName?: string
): string {
  const owner = doctorName ? `${doctorName}'s` : "the clinic";
  return `You have joined ${owner} queue. Your token is ${formatQueueToken(tokenNumber)}.`;
}

export function formatPatientCalledMessage(tokenNumber: number): string {
  return `Your token ${formatQueueToken(tokenNumber)} is being called. Please proceed to the consultation area.`;
}

export function formatConsultationStartedMessage(tokenNumber: number): string {
  return `Your consultation (${formatQueueToken(tokenNumber)}) has started.`;
}

export const QUEUE_PAUSED_MESSAGE =
  "The queue is temporarily paused. Your position is preserved.";

export const QUEUE_RESUMED_MESSAGE =
  "The queue has resumed. Your position is preserved.";

export const NO_SHOW_MESSAGE =
  "Your queue entry was marked as no-show. Please contact the clinic if this was unexpected.";