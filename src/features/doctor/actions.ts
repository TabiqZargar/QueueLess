"use server";

import { queueService } from "@/lib/queue/instance";
import { entryIdSchema } from "@/lib/validation/identifiers";
import { formatQueueToken } from "@/lib/utils";
import { requireRole } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  ActionResult,
  toActionResultError,
} from "@/lib/queue/action-error";

export type { ActionResult };

/**
 * Doctor consultation actions. Both delegate to the single QueueService
 * implementation - no queue business logic lives here. Consultation state
 * changes are DOCTOR-only per the RBAC permission matrix.
 */
export async function startConsultationAction(
  entryId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.DOCTOR);

    const parsed = entryIdSchema.safeParse(entryId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue entry identifier.",
      };
    }

    const started = await queueService.startConsultation(parsed.data);
    return {
      success: true,
      message: `Consultation started for ${formatQueueToken(started.tokenNumber)}.`,
    };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function completeConsultationAction(
  entryId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.DOCTOR);

    const parsed = entryIdSchema.safeParse(entryId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue entry identifier.",
      };
    }

    const completed = await queueService.completeConsultation(parsed.data);
    return {
      success: true,
      message: `Consultation completed for ${formatQueueToken(completed.tokenNumber)}.`,
    };
  } catch (err) {
    return toActionResultError(err);
  }
}