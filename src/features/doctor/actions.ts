"use server";

import { queueService } from "@/lib/queue/instance";
import { formatQueueToken } from "@/lib/utils";
import { requireRole } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  ActionResult,
  toActionErrorMessage,
} from "@/lib/queue/action-error";

/**
 * Doctor consultation actions. Both delegate to the single
 * QueueService implementation - no queue business logic lives here.
 * Consultation state changes are DOCTOR-only per the RBAC permission matrix.
 */

export async function startConsultationAction(
  entryId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.DOCTOR);
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
    await requireRole(USER_ROLES.DOCTOR);
    const completed = await queueService.completeConsultation(entryId);
    return {
      message: `Consultation completed for ${formatQueueToken(completed.tokenNumber)}.`,
    };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}