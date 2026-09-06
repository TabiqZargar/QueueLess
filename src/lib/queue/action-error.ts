import {
  CannotCallNextPatientError,
  InvalidTransitionError,
  NoPatientsWaitingError,
  QueueClosedError,
  QueueEntryNotFoundError,
  QueueError,
  QueueNotActiveError,
  QueueNotFoundError,
  QueuePausedError,
} from "./errors";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/auth/errors";

/**
 * Stable, machine-readable error codes returned by server entry points
 * (server actions today, future API route handlers). The UI must not depend
 * on parsing human-readable error strings; it may branch on `code`.
 *
 * The set is derived from the existing domain errors (src/lib/queue/errors.ts
 * and src/lib/auth/errors.ts). Ownership violations surface as FORBIDDEN
 * because ensureOwnership raises AuthorizationError; the human message can
 * still be more specific via toActionResultError/join/cancel wrappers.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "QUEUE_NOT_FOUND"
  | "QUEUE_NOT_ACTIVE"
  | "QUEUE_PAUSED"
  | "QUEUE_CLOSED"
  | "ENTRY_NOT_FOUND"
  | "INVALID_QUEUE_STATE"
  | "NO_PATIENTS_WAITING"
  | "INTERNAL_ERROR";

/**
 * Shared discriminated union returned by every mutation server action.
 *
 * Successes carry an optional payload and, for actions that produce user
 * feedback, a human message. Failures always carry both a stable code and a
 * safe, user-facing message - never stack traces or internal error text.
 */
export type ActionResult<T = void> =
  | {
      success: true;
      data?: T;
      message?: string;
      error?: never;
    }
  | {
      success: false;
      error: string;
      code: ErrorCode;
      message?: never;
    };

/**
 * Maps a thrown domain/authentication error to its stable error code.
 * Ordering matters: specific subclasses must be tested before their base.
 */
export function toActionErrorCode(err: unknown): ErrorCode {
  if (err instanceof AuthenticationError) return "UNAUTHENTICATED";
  if (err instanceof AuthorizationError) return "FORBIDDEN";
  if (err instanceof QueueNotFoundError) return "QUEUE_NOT_FOUND";
  if (err instanceof QueueEntryNotFoundError) return "ENTRY_NOT_FOUND";
  if (err instanceof QueuePausedError) return "QUEUE_PAUSED";
  if (err instanceof QueueNotActiveError) return "QUEUE_NOT_ACTIVE";
  if (err instanceof QueueClosedError) return "QUEUE_CLOSED";
  if (err instanceof NoPatientsWaitingError) return "NO_PATIENTS_WAITING";
  if (err instanceof InvalidTransitionError) return "INVALID_QUEUE_STATE";
  if (err instanceof CannotCallNextPatientError) return "INVALID_QUEUE_STATE";
  if (err instanceof QueueError) return "INTERNAL_ERROR";
  return "INTERNAL_ERROR";
}

/**
 * Maps QueueService domain errors to safe, user-facing messages. Never
 * exposes stack traces or internal error text.
 */
export function toActionErrorMessage(err: unknown): string {
  if (err instanceof AuthenticationError) {
    return "Please sign in to continue.";
  }
  if (err instanceof AuthorizationError) {
    return "You are not authorized to perform this action.";
  }
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

/**
 * Builds the failure variant of ActionResult from a thrown error, keeping code
 * and message in one place so every server action maps errors identically.
 */
export function toActionResultError(err: unknown): {
  success: false;
  error: string;
  code: ErrorCode;
} {
  return {
    success: false,
    code: toActionErrorCode(err),
    error: toActionErrorMessage(err),
  };
}