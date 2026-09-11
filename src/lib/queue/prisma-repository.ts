import {
  Doctor,
  Patient,
  Queue,
  QueueEntry,
  QueueEntryStatus,
  QueueEvent,
  QueueEventType,
  QueueStatus,
} from "@/types";

import {
  QueueRepository,
  CreateQueueEntryInput,
  UpdateQueueEntryInput,
  QueueStatistics,
  QueueWithDetails,
} from "./repository";

import { calculateEstimatedWait, countWaiting } from "./calculations";
import { db } from "../../../prisma/db";

export class PrismaQueueRepository implements QueueRepository {
  async getQueue(queueId: string): Promise<Queue | null> {
    const queue = await db.orm.public.Queue.where({ id: queueId }).first();

    return queue ? this.toQueue(queue) : null;
  }

  async getQueueWithDetails(
    queueId: string
  ): Promise<QueueWithDetails | null> {
    const queue = await db.orm.public.Queue.where({ id: queueId }).first();

    if (!queue) {
      return null;
    }

    return this.toQueueWithDetails(queue);
  }

  async listQueues(): Promise<QueueWithDetails[]> {
    const queues = await db.orm.public.Queue
      .orderBy((queue) => queue.updatedAt.asc())
      .all();

    return queues.map((queue) => this.toQueueWithDetails(queue));
  }

  async getQueueEntries(queueId: string): Promise<QueueEntry[]> {
    const entries = await db.orm.public.QueueEntry
      .where({ queueId })
      .orderBy((entry) => entry.tokenNumber.asc())
      .all();

    return entries.map((entry) => this.toQueueEntry(entry));
  }

  async getQueueEntry(entryId: string): Promise<QueueEntry | null> {
    const entry = await db.orm.public.QueueEntry.where({ id: entryId }).first();

    return entry ? this.toQueueEntry(entry) : null;
  }

  async findEntryByToken(
    queueId: string,
    tokenNumber: number
  ): Promise<QueueEntry | null> {
    const entry = await db.orm.public.QueueEntry
      .where({ queueId, tokenNumber })
      .first();

    return entry ? this.toQueueEntry(entry) : null;
  }

  async createQueueEntry(
    data: CreateQueueEntryInput
  ): Promise<QueueEntry> {
    const entry = await db.orm.public.QueueEntry.create({
      id: crypto.randomUUID(),
      queueId: data.queueId,
      patientId: data.patientId,
      tokenNumber: data.tokenNumber,
      entryType: data.entryType,
      status: data.status,
      joinedAt: data.joinedAt.toISOString(),
    });

    return this.toQueueEntry(entry);
  }

  async updateQueueEntry(
    entryId: string,
    data: UpdateQueueEntryInput
  ): Promise<QueueEntry> {
    const entry = await db.orm.public.QueueEntry
      .where({ id: entryId })
      .update({
        ...(data.status !== undefined && {
          status: data.status,
        }),
        ...(data.calledAt !== undefined && {
          calledAt: data.calledAt.toISOString(),
        }),
        ...(data.consultationStartedAt !== undefined && {
          consultationStartedAt: data.consultationStartedAt.toISOString(),
        }),
        ...(data.completedAt !== undefined && {
          completedAt: data.completedAt.toISOString(),
        }),
        ...(data.cancelledAt !== undefined && {
          cancelledAt: data.cancelledAt.toISOString(),
        }),
      });

    return this.toQueueEntry(entry);
  }

  async getNextWaitingEntry(
    queueId: string
  ): Promise<QueueEntry | null> {
    const entry = await db.orm.public.QueueEntry
      .where({ queueId, status: "WAITING" })
      .orderBy((entry) => entry.tokenNumber.asc())
      .first();

    return entry ? this.toQueueEntry(entry) : null;
  }

  async updateQueueStatus(
    queueId: string,
    status: QueueStatus
  ): Promise<Queue> {
    const now = new Date();

    const queue = await db.orm.public.Queue
      .where({ id: queueId })
      .update({
        status,
        updatedAt: now.toISOString(),
        ...(status === "PAUSED" && {
          pausedAt: now.toISOString(),
        }),
      });

    return this.toQueue(queue);
  }

  async getDoctor(doctorId: string): Promise<Doctor | null> {
    const doctor = await db.orm.public.Doctor.where({ id: doctorId }).first();

    return doctor ? this.toDoctor(doctor) : null;
  }

  async getPatient(patientId: string): Promise<Patient | null> {
    const patient = await db.orm.public.Patient.where({ id: patientId }).first();

    return patient ? this.toPatient(patient) : null;
  }

  async getQueueStatistics(
    queueId: string
  ): Promise<QueueStatistics> {
    const queue = await db.orm.public.Queue.where({ id: queueId }).first();

    if (!queue) {
      throw new Error(`Queue not found: ${queueId}`);
    }

    const entries = await this.getQueueEntries(queueId);
    const doctor = await this.getDoctor(queue.doctorId);

    const averageConsultationMinutes =
      doctor?.averageConsultationMinutes ?? 5;

    const totalWaiting = countWaiting(entries);

    const estimatedWaitMinutes = calculateEstimatedWait(
      totalWaiting,
      averageConsultationMinutes
    );

    const active = entries
      .filter((entry) => entry.status === "IN_CONSULTATION")
      .sort((a, b) => a.tokenNumber - b.tokenNumber);

    const completed = entries
      .filter((entry) => entry.status === "COMPLETED")
      .sort((a, b) => b.tokenNumber - a.tokenNumber);

    const currentToken =
      active[0]?.tokenNumber ??
      completed[0]?.tokenNumber ??
      queue.currentToken ??
      null;

    return {
      totalWaiting,
      currentToken,
      averageConsultationMinutes,
      estimatedWaitMinutes,
      totalInQueue: entries.length,
    };
  }

  async addQueueEvent(
    event: Omit<QueueEvent, "id" | "timestamp">
  ): Promise<QueueEvent> {
    const newEvent = await db.orm.public.QueueEvent.create({
      id: crypto.randomUUID(),
      queueId: event.queueId,
      queueEntryId: event.queueEntryId ?? null,
      actorUserId: event.actorUserId ?? null,
      eventType: event.eventType,
      timestamp: new Date().toISOString(),
      metadata: (event.metadata ?? null) as any,
    });

    return this.toQueueEvent(newEvent);
  }

  async getQueueEvents(
    queueId: string
  ): Promise<QueueEvent[]> {
    const events = await db.orm.public.QueueEvent
      .where({ queueId })
      .orderBy((event) => event.timestamp.asc())
      .all();

    return events.map((event) => this.toQueueEvent(event));
  }

  private toQueue(value: any): Queue {
    return {
      id: value.id,
      clinicId: value.clinicId,
      departmentId: value.departmentId,
      doctorId: value.doctorId,
      queueDate: new Date(value.queueDate),
      status: value.status as QueueStatus,
      currentToken: value.currentToken,
      startedAt: value.startedAt ? new Date(value.startedAt) : undefined,
      pausedAt: value.pausedAt ? new Date(value.pausedAt) : undefined,
      endedAt: value.endedAt ? new Date(value.endedAt) : undefined,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
    };
  }

  private toQueueWithDetails(value: any): QueueWithDetails {
    return {
      ...this.toQueue(value),
      doctor: undefined,
      departmentName: undefined,
      clinicName: undefined,
    };
  }

  private toQueueEntry(value: any): QueueEntry {
    return {
      id: value.id,
      queueId: value.queueId,
      patientId: value.patientId,
      tokenNumber: value.tokenNumber,
      entryType: value.entryType,
      status: value.status as QueueEntryStatus,
      joinedAt: new Date(value.joinedAt),
      calledAt: value.calledAt ? new Date(value.calledAt) : undefined,
      consultationStartedAt: value.consultationStartedAt
        ? new Date(value.consultationStartedAt)
        : undefined,
      completedAt: value.completedAt ? new Date(value.completedAt) : undefined,
      cancelledAt: value.cancelledAt ? new Date(value.cancelledAt) : undefined,
    };
  }

  private toDoctor(value: any): Doctor {
    return {
      id: value.id,
      userId: value.userId ?? undefined,
      displayName: value.displayName,
      departmentId: value.departmentId,
      status: value.status,
      averageConsultationMinutes: value.averageConsultationMinutes,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
    };
  }

  private toPatient(value: any): Patient {
    return {
      id: value.id,
      name: value.name,
      phone: value.phone,
      email: value.email ?? undefined,
      clinicId: value.clinicId,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
    };
  }

  private toQueueEvent(value: any): QueueEvent {
    return {
      id: value.id,
      queueId: value.queueId,
      queueEntryId: value.queueEntryId ?? undefined,
      actorUserId: value.actorUserId ?? undefined,
      eventType: value.eventType as QueueEventType,
      timestamp: new Date(value.timestamp),
      metadata: value.metadata ?? undefined,
    };
  }
}