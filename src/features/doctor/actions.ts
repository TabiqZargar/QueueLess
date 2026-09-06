"use server";

import { queueService } from "@/lib/queue/instance";
import { formatQueueToken } from "@/lib/utils";
import {
  ActionResult,
  toActionErrorMessage,
} from "@/lib/queue/action-error";

/**
 * Doctor consultation actions. Both delegate to the single
 * QueueService implementation - no queue business logic lives here.
 */

export async function startConsultationAction(
  entryId: string
): Promise<ActionResult> {
  try {
    const started = await queueService.startConsultation(entryId);
    return {
      message: `Consultation started for ${formatQueueToken(started.tokenNumber)}.`,
    };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}

export async function completeConsultationAction(
  entryId: string
): Promise<ActionResult> {
  try {
    const completed = await queueService.completeConsultation(entryId);
    return {
      message: `Consultation completed for ${formatQueueToken(completed.tokenNumber)}.`,
    };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}