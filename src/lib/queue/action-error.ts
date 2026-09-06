import {
  CannotCallNextPatientError,
  InvalidTransitionError,
  NoPatientsWaitingError,
  QueueEntryNotFoundError,
  QueueError,
  QueueNotActiveError,
  QueueNotFoundError,
  QueuePausedError,
} from "./errors";

/**
 * Result shape returned by server actions to the client UI.
 */
export interface ActionResult {
  message?: string;
  error?: string;
}

/**
 * Maps QueueService domain errors to safe, user-facing messages.
 * Never exposes stack traces or internal error text.
 */
export function toActionErrorMessage(err: unknown): string {
  if (err instanceof CannotCallNextPatientError) {
    return "A patient is already being called or served. Complete the current operation before calling another patient.";
  }
  if (err instanceof QueuePausedError) {
    return "This queue is paused. Resume the queue before performing this action.";
  }
  if (err instanceof QueueNotActiveError) {
    return "This queue is not active.";
  }
  if (err instanceof QueueNotFoundError) {
    return "This queue could not be found.";
  }
  if (err instanceof QueueEntryNotFoundError) {
    return "This patient record could not be found.";
  }
  if (err instanceof NoPatientsWaitingError) {
    return "There are no patients waiting to be called.";
  }
  if (err instanceof InvalidTransitionError) {
    return "This action is not allowed for the patient's current status.";
  }
  if (err instanceof QueueError) {
    return "Unable to complete this action. Please try again.";
  }
  return "Something went wrong. Please try again.";
}