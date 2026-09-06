"use server";

import { queueService } from "@/lib/queue/instance";
import { getPatientStore } from "@/features/patients/patient-store";
import { addWalkInSchema } from "@/lib/validation/staff";
import { formatQueueToken } from "@/lib/utils";
import {
  ActionResult,
  toActionErrorMessage,
} from "@/lib/queue/action-error";

export type { ActionResult };

export async function callNextPatientAction(
  queueId: string
): Promise<ActionResult> {
  try {
    const called = await queueService.callNextPatient(queueId);
    return { message: `Patient ${formatQueueToken(called.tokenNumber)} called.` };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}

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

export async function markNoShowAction(
  entryId: string
): Promise<ActionResult> {
  try {
    const marked = await queueService.markNoShow(entryId);
    return {
      message: `Patient ${formatQueueToken(marked.tokenNumber)} marked as no-show.`,
    };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}

export async function cancelEntryAction(
  entryId: string
): Promise<ActionResult> {
  try {
    const cancelled = await queueService.cancelQueueEntry(entryId);
    return {
      message: `Entry ${formatQueueToken(cancelled.tokenNumber)} cancelled.`,
    };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}

export async function addWalkInAction(input: {
  queueId: string;
  name: string;
  phone?: string;
}): Promise<ActionResult> {
  const parsed = addWalkInSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid walk-in details." };
  }

  try {
    const queue = await queueService.getQueue(parsed.data.queueId);
    if (!queue) {
      return { error: "The queue is unavailable." };
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
      message: `Walk-in ${formatQueueToken(result.entry.tokenNumber)} added. Position ${result.position}. Estimated wait ${result.estimatedWaitMinutes} min.`,
    };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}

export async function pauseQueueAction(
  queueId: string
): Promise<ActionResult> {
  try {
    await queueService.pauseQueue(queueId);
    return { message: "Queue paused." };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}

export async function resumeQueueAction(
  queueId: string
): Promise<ActionResult> {
  try {
    await queueService.resumeQueue(queueId);
    return { message: "Queue resumed." };
  } catch (err) {
    return { error: toActionErrorMessage(err) };
  }
}
