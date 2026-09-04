import {
  Queue,
  QueueEntry,
  QueueEventType,
  QueuePosition,
} from "@/types";
import { QueueRepository, QueueStatistics, QueueWithDetails } from "./repository";
import { InvalidTransitionError, NoPatientsWaitingError, QueueEntryNotFoundError, QueueNotFoundError, QueueNotActiveError, QueuePausedError } from "./errors";
import {
  canTransition,
  canTransitionQueueStatus,
} from "./state-machine";
import {
  calculateEstimatedWait,
  calculateQueuePosition,
  countPatientsAhead,
  getCurrentServingToken,
  countWaiting,
} from "./calculations";

export interface JoinQueueInput {
  queueId: string;
  patientId: string;
  entryType?: "APPOINTMENT" | "WALK_IN";
}

export interface QueueJoinResult {
  entry: QueueEntry;
  position: number;
  estimatedWaitMinutes: number;
}

export interface QueueActionResult {
  entry: QueueEntry;
  event: QueueEventType;
}

export class QueueService {
  constructor(private repository: QueueRepository) {}

  async getQueue(queueId: string): Promise<QueueWithDetails | null> {
    return this.repository.getQueueWithDetails(queueId);
  }

  async getQueueStats(queueId: string): Promise<QueueStatistics> {
    const queue = await this.repository.getQueue(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }
    return this.repository.getQueueStatistics(queueId);
  }

  async joinQueue(input: JoinQueueInput): Promise<QueueJoinResult> {
    const queue = await this.repository.getQueue(input.queueId);
    if (!queue) {
      throw new QueueNotFoundError(input.queueId);
    }

    if (queue.status !== "ACTIVE") {
      if (queue.status === "PAUSED") {
        throw new QueuePausedError(input.queueId);
      }
      throw new QueueNotActiveError(input.queueId, queue.status);
    }

    const currentToken = await this.getNextTokenNumber(input.queueId);

    const entry = await this.repository.createQueueEntry({
      queueId: input.queueId,
      patientId: input.patientId,
      tokenNumber: currentToken,
      entryType: input.entryType ?? "APPOINTMENT",
      status: "WAITING",
      joinedAt: new Date(),
    });

    await this.repository.addQueueEvent({
      queueId: input.queueId,
      queueEntryId: entry.id,
      eventType: "QUEUE_JOINED",
    });

    const position = await this.getQueuePosition(entry.id);
    const average = await this.getQueueAverageConsultationMinutes(input.queueId);
    const estimatedWaitMinutes = calculateEstimatedWait(
      position.patientsAhead,
      average
    );

    return { entry, position: position.position, estimatedWaitMinutes };
  }

  async getQueuePosition(entryId: string): Promise<QueuePosition> {
    const entry = await this.repository.getQueueEntry(entryId);
    if (!entry) {
      throw new QueueEntryNotFoundError(entryId);
    }

    const entries = await this.repository.getQueueEntries(entry.queueId);

    const patientsAhead = countPatientsAhead(entries, entryId);
    const position = calculateQueuePosition(entries, entryId);

    const average = await this.getQueueAverageConsultationMinutes(
      entry.queueId
    );

    return {
      position,
      patientsAhead,
      estimatedWaitMinutes: calculateEstimatedWait(
        Math.max(patientsAhead, 0),
        average
      ),
      currentServingToken: getCurrentServingToken(entries) ?? 0,
      totalInQueue: countWaiting(entries),
    };
  }

  async callNextPatient(queueId: string): Promise<QueueEntry> {
    const queue = await this.repository.getQueue(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }

    if (queue.status !== "ACTIVE") {
      if (queue.status === "PAUSED") {
        throw new QueuePausedError(queueId);
      }
      throw new QueueNotActiveError(queueId, queue.status);
    }

    const entries = await this.repository.getQueueEntries(queueId);
    const hasActiveConsultation = entries.some(
      (e) =>
        e.status === "IN_CONSULTATION" || e.status === "CALLED"
    );

    if (hasActiveConsultation) {
      throw new Error(
        "Cannot call next patient while there is already a patient in consultation or called"
      );
    }

    const next = await this.repository.getNextWaitingEntry(queueId);
    if (!next) {
      throw new NoPatientsWaitingError(queueId);
    }

    const updated = await this.repository.updateQueueEntry(next.id, {
      status: "CALLED",
      calledAt: new Date(),
    });

    await this.repository.addQueueEvent({
      queueId,
      queueEntryId: updated.id,
      eventType: "PATIENT_CALLED",
    });

    return updated;
  }

  async startConsultation(entryId: string): Promise<QueueEntry> {
    const entry = await this.repository.getQueueEntry(entryId);
    if (!entry) {
      throw new QueueEntryNotFoundError(entryId);
    }

    if (!canTransition(entry.status, "IN_CONSULTATION")) {
      throw new InvalidTransitionError(entry.status, "IN_CONSULTATION");
    }

    const updated = await this.repository.updateQueueEntry(entryId, {
      status: "IN_CONSULTATION",
      consultationStartedAt: new Date(),
    });

    await this.repository.addQueueEvent({
      queueId: entry.queueId,
      queueEntryId: entryId,
      eventType: "CONSULTATION_STARTED",
    });

    return updated;
  }

  async completeConsultation(entryId: string): Promise<QueueEntry> {
    const entry = await this.repository.getQueueEntry(entryId);
    if (!entry) {
      throw new QueueEntryNotFoundError(entryId);
    }

    if (!canTransition(entry.status, "COMPLETED")) {
      throw new InvalidTransitionError(entry.status, "COMPLETED");
    }

    const updated = await this.repository.updateQueueEntry(entryId, {
      status: "COMPLETED",
      completedAt: new Date(),
    });

    await this.repository.addQueueEvent({
      queueId: entry.queueId,
      queueEntryId: entryId,
      eventType: "CONSULTATION_COMPLETED",
    });

    return updated;
  }

  async markNoShow(entryId: string): Promise<QueueEntry> {
    const entry = await this.repository.getQueueEntry(entryId);
    if (!entry) {
      throw new QueueEntryNotFoundError(entryId);
    }

    if (!canTransition(entry.status, "NO_SHOW")) {
      throw new InvalidTransitionError(entry.status, "NO_SHOW");
    }

    const updated = await this.repository.updateQueueEntry(entryId, {
      status: "NO_SHOW",
    });

    await this.repository.addQueueEvent({
      queueId: entry.queueId,
      queueEntryId: entryId,
      eventType: "PATIENT_NO_SHOW",
    });

    return updated;
  }

  async cancelQueueEntry(entryId: string): Promise<QueueEntry> {
    const entry = await this.repository.getQueueEntry(entryId);
    if (!entry) {
      throw new QueueEntryNotFoundError(entryId);
    }

    if (!canTransition(entry.status, "CANCELLED")) {
      throw new InvalidTransitionError(entry.status, "CANCELLED");
    }

    const updated = await this.repository.updateQueueEntry(entryId, {
      status: "CANCELLED",
      cancelledAt: new Date(),
    });

    await this.repository.addQueueEvent({
      queueId: entry.queueId,
      queueEntryId: entryId,
      eventType: "PATIENT_CANCELLED",
    });

    return updated;
  }

  async pauseQueue(queueId: string): Promise<Queue> {
    const queue = await this.repository.getQueue(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }

    if (!canTransitionQueueStatus(queue.status, "PAUSED")) {
      throw new InvalidTransitionError(queue.status, "PAUSED");
    }

    const updated = await this.repository.updateQueueStatus(queueId, "PAUSED");

    await this.repository.addQueueEvent({
      queueId,
      eventType: "QUEUE_PAUSED",
    });

    return updated;
  }

  async resumeQueue(queueId: string): Promise<Queue> {
    const queue = await this.repository.getQueue(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }

    if (!canTransitionQueueStatus(queue.status, "ACTIVE")) {
      throw new InvalidTransitionError(queue.status, "ACTIVE");
    }

    const updated = await this.repository.updateQueueStatus(queueId, "ACTIVE");

    await this.repository.addQueueEvent({
      queueId,
      eventType: "QUEUE_RESUMED",
    });

    return updated;
  }

  async addWalkIn(input: {
    queueId: string;
    patientId: string;
  }): Promise<QueueJoinResult> {
    return this.joinQueue({
      queueId: input.queueId,
      patientId: input.patientId,
      entryType: "WALK_IN",
    });
  }

  async getQueueEvents(queueId: string) {
    return this.repository.getQueueEvents(queueId);
  }

  private async getNextTokenNumber(queueId: string): Promise<number> {
    const entries = await this.repository.getQueueEntries(queueId);
    const maxToken = entries.reduce(
      (max, e) => Math.max(max, e.tokenNumber),
      0
    );
    return maxToken + 1;
  }

  private async getQueueAverageConsultationMinutes(
    queueId: string
  ): Promise<number> {
    const queue = await this.repository.getQueue(queueId);
    if (!queue) {
      throw new QueueNotFoundError(queueId);
    }
    const doctor = await this.repository.getDoctor(queue.doctorId);
    return doctor?.averageConsultationMinutes ?? 5;
  }
}
