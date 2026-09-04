"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { joinQueueSchema } from "@/lib/validation/patient";
import { queueService } from "@/lib/queue/instance";
import { getPatientStore } from "./patient-store";
import {
  buildEntryCookieValue,
  ENTRY_COOKIE_NAME,
  getStoredEntryCookie,
} from "./entry-session";
import {
  InvalidTransitionError,
  QueueError,
  QueueNotFoundError,
  QueuePausedError,
} from "@/lib/queue/errors";

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
    const queue = await queueService.getQueue(queueId);
    if (!queue) {
      return { error: "The selected queue is unavailable." };
    }

    const patient = getPatientStore().registerPatient({
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
    if (err instanceof QueueError) {
      return { error: "Unable to join this queue right now. Please try again." };
    }
    return { error: "Something went wrong. Please try again." };
  }
}

export async function cancelQueueEntryAction(): Promise<{
  error?: string;
}> {
  const stored = getStoredEntryCookie();
  if (!stored) {
    return { error: "No active queue entry found." };
  }

  try {
    await queueService.cancelQueueEntry(stored.entryId);
    cookies().delete(ENTRY_COOKIE_NAME);
    return {};
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { error: "This queue entry can no longer be cancelled." };
    }
    return { error: "Unable to cancel your entry. Please try again." };
  }
}