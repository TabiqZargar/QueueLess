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

export interface JoinQueueActionResult {
  queueId: string;
  tokenNumber: number;
  position: number;
  estimatedWaitMinutes: number;
}

export interface JoinQueueActionState {
  error?: string;
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
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { queueId, name, phone } = parsed.data;

  try {
    const user = await requireRole(USER_ROLES.PATIENT);

    const queue = await queueService.getQueue(queueId);
    if (!queue) {
      return { error: "The selected queue is unavailable." };
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
      return { error: "This queue is paused and not accepting new patients." };
    }
    if (err instanceof QueueNotFoundError) {
      return { error: "The selected queue is unavailable." };
    }
    if (err instanceof AuthenticationError) {
      return { error: "Please sign in to join a queue." };
    }
    if (err instanceof AuthorizationError) {
      return { error: "You are not authorized to join this queue." };
    }
    if (err instanceof QueueError) {
      return { error: "Unable to join this queue right now. Please try again." };
    }
    return { error: "Something went wrong. Please try again." };
  }
}

export async function cancelQueueEntryAction(): Promise<{
  error?: string;
}> {
  try {
    const user = await requireRole(USER_ROLES.PATIENT);
    const stored = getStoredEntryCookie();
    if (!stored) {
      return { error: "No active queue entry found." };
    }

    const entry = await queueService.getQueueEntry(stored.entryId);
    if (!entry) {
      return { error: "Unable to cancel your entry. Please try again." };
    }

    ensureOwnership(user.id, entry.patientId);

    await queueService.cancelQueueEntry(stored.entryId);
    cookies().delete(ENTRY_COOKIE_NAME);
    return {};
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { error: "This queue entry can no longer be cancelled." };
    }
    if (err instanceof AuthenticationError) {
      return { error: "Please sign in to cancel your entry." };
    }
    if (err instanceof AuthorizationError) {
      return { error: "You are not authorized to cancel this entry." };
    }
    return { error: "Unable to cancel your entry. Please try again." };
  }
}