import { QueueEntryStatus, QueueStatus } from "@/types";

const VALID_ENTRY_TRANSITIONS: Record<QueueEntryStatus, QueueEntryStatus[]> = {
  REGISTERED: ["WAITING"],
  WAITING: ["CALLED", "CANCELLED", "NO_SHOW"],
  CALLED: ["IN_CONSULTATION", "NO_SHOW"],
  IN_CONSULTATION: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

const VALID_QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  NOT_STARTED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["ACTIVE", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  from: QueueEntryStatus,
  to: QueueEntryStatus
): boolean {
  return VALID_ENTRY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateEntryTransition(
  from: QueueEntryStatus,
  to: QueueEntryStatus
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition from ${from} to ${to}`);
  }
}

export function canTransitionQueueStatus(
  from: QueueStatus,
  to: QueueStatus
): boolean {
  return VALID_QUEUE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateQueueTransition(
  from: QueueStatus,
  to: QueueStatus
): void {
  if (!canTransitionQueueStatus(from, to)) {
    throw new Error(`Invalid queue transition from ${from} to ${to}`);
  }
}
