"use server";

import { queueService } from "@/lib/queue/instance";
import { getPatientStore } from "@/features/patients/patient-store";
import { addWalkInSchema } from "@/lib/validation/staff";
import { entryIdSchema, queueIdSchema } from "@/lib/validation/identifiers";
import { formatQueueToken } from "@/lib/utils";
import { requireRole } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  ActionResult,
  toActionResultError,
} from "@/lib/queue/action-error";

export type { ActionResult };

/**
 * Staff queue operations. Every action follows the same server-entry
 * contract: authenticate, authorize, validate, invoke the queue service,
 * convert domain errors, return a typed result. No queue business logic
 * (transition rules, positions, ETAs) lives here - QueueService is the
 * single authoritative engine.
 */

export async function callNextPatientAction(
  queueId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = queueIdSchema.safeParse(queueId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue identifier.",
      };
    }

    const called = await queueService.callNextPatient(parsed.data);
    return {
      success: true,
      message: `Patient ${formatQueueToken(called.tokenNumber)} called.`,
    };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function markNoShowAction(
  entryId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = entryIdSchema.safeParse(entryId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue entry identifier.",
      };
    }

    const marked = await queueService.markNoShow(parsed.data);
    return {
      success: true,
      message: `Patient ${formatQueueToken(marked.tokenNumber)} marked as no-show.`,
    };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function cancelEntryAction(
  entryId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = entryIdSchema.safeParse(entryId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue entry identifier.",
      };
    }

    const cancelled = await queueService.cancelQueueEntry(parsed.data);
    return {
      success: true,
      message: `Entry ${formatQueueToken(cancelled.tokenNumber)} cancelled.`,
    };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function addWalkInAction(input: {
  queueId: string;
  name: string;
  phone?: string;
}): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = addWalkInSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid walk-in details.",
      };
    }

    const queue = await queueService.getQueue(parsed.data.queueId);
    if (!queue) {
      return {
        success: false,
        code: "QUEUE_NOT_FOUND",
        error: "The queue is unavailable.",
      };
    }

    const patient = getPatientStore().registerPatient({
      name: parsed.data.name,
      phone: parsed.data.phone ?? "",
      clinicId: queue.clinicId,
    });

    const result = await queueService.addWalkIn({
      queueId: parsed.data.queueId,
      patientId: patient.id,
    });

    return {
      success: true,
      message: `Walk-in ${formatQueueToken(result.entry.tokenNumber)} added. Position ${result.position}. Estimated wait ${result.estimatedWaitMinutes} min.`,
    };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function pauseQueueAction(
  queueId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = queueIdSchema.safeParse(queueId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue identifier.",
      };
    }

    await queueService.pauseQueue(parsed.data);
    return { success: true, message: "Queue paused." };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function resumeQueueAction(
  queueId: string
): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = queueIdSchema.safeParse(queueId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid queue identifier.",
      };
    }

    await queueService.resumeQueue(parsed.data);
    return { success: true, message: "Queue resumed." };
  } catch (err) {
    return toActionResultError(err);
  }
}