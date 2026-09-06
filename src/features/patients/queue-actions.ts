"use server";

import { cookies } from "next/headers";
import { joinQueueSchema } from "@/lib/validation/patient";
import { queueService } from "@/lib/queue/instance";
import { getPatientStore } from "./patient-store";
import {
  buildEntryCookieValue,
  ENTRY_COOKIE_NAME,
  getStoredEntryCookie,
} from "./entry-session";
import {
  requireRole,
  ensureOwnership,
} from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  InvalidTransitionError,
  QueueError,
  QueueNotFoundError,
  QueuePausedError,
} from "@/lib/queue/errors";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/auth/errors";
import {
  ActionResult,
  ErrorCode,
  toActionErrorCode,
} from "@/lib/queue/action-error";

export interface JoinQueueActionResult {
  queueId: string;
  tokenNumber: number;
  position: number;
  estimatedWaitMinutes: number;
}

export interface JoinQueueActionState {
  error?: string;
  code?: ErrorCode;
  fieldErrors?: Record<string, string[]>;
  result?: JoinQueueActionResult;
}

export async function joinQueueAction(
  _prevState: JoinQueueActionState,
  formData: FormData
): Promise<JoinQueueActionState> {
  const raw = {
    queueId: formData.get("queueId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
  };

  const parsed = joinQueueSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please check the information you entered.",
      code: "VALIDATION_ERROR",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { queueId, name, phone } = parsed.data;

  try {
    const user = await requireRole(USER_ROLES.PATIENT);

    const queue = await queueService.getQueue(queueId);
    if (!queue) {
      return {
        error: "The selected queue is unavailable.",
        code: "QUEUE_NOT_FOUND",
      };
    }

    const patient = getPatientStore().getOrCreatePatientForUser({
      userId: user.id,
      name,
      phone,
      clinicId: queue.clinicId,
    });

    const result = await queueService.joinQueue({
      queueId,
      patientId: patient.id,
    });

    const value = buildEntryCookieValue({
      queueId,
      entryId: result.entry.id,
    });
    cookies().set(ENTRY_COOKIE_NAME, value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return {
      result: {
        queueId,
        tokenNumber: result.entry.tokenNumber,
        position: result.position,
        estimatedWaitMinutes: result.estimatedWaitMinutes,
      },
    };
  } catch (err) {
    if (err instanceof QueuePausedError) {
      return { error: "This queue is paused and not accepting new patients.", code: "QUEUE_PAUSED" };
    }
    if (err instanceof QueueNotFoundError) {
      return { error: "The selected queue is unavailable.", code: "QUEUE_NOT_FOUND" };
    }
    if (err instanceof AuthenticationError) {
      return { error: "Please sign in to join a queue.", code: "UNAUTHENTICATED" };
    }
    if (err instanceof AuthorizationError) {
      return { error: "You are not authorized to join this queue.", code: "FORBIDDEN" };
    }
    if (err instanceof QueueError) {
      return { error: "Unable to join this queue right now. Please try again.", code: toActionErrorCode(err) };
    }
    return { error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" };
  }
}

export async function cancelQueueEntryAction(): Promise<ActionResult> {
  try {
    const user = await requireRole(USER_ROLES.PATIENT);
    const stored = getStoredEntryCookie();
    if (!stored) {
      return {
        success: false,
        code: "ENTRY_NOT_FOUND",
        error: "No active queue entry found.",
      };
    }

    const entry = await queueService.getQueueEntry(stored.entryId);
    if (!entry) {
      return {
        success: false,
        code: "ENTRY_NOT_FOUND",
        error: "Unable to cancel your entry. Please try again.",
      };
    }

    ensureOwnership(user.id, entry.patientId);

    await queueService.cancelQueueEntry(stored.entryId);
    cookies().delete(ENTRY_COOKIE_NAME);
    return { success: true };
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { success: false, code: "INVALID_QUEUE_STATE", error: "This queue entry can no longer be cancelled." };
    }
    if (err instanceof AuthenticationError) {
      return { success: false, code: "UNAUTHENTICATED", error: "Please sign in to cancel your entry." };
    }
    if (err instanceof AuthorizationError) {
      return { success: false, code: "FORBIDDEN", error: "You are not authorized to cancel this entry." };
    }
    return { success: false, code: "INTERNAL_ERROR", error: "Unable to cancel your entry. Please try again." };
  }
}