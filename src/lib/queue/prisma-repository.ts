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
import {
  CannotCallNextPatientError,
  QueueNotActiveError,
  QueueNotFoundError,
  QueuePausedError,
} from "./errors";

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

  async joinQueueAtomic(data: CreateQueueEntryInput): Promise<QueueEntry> {
    return db.transaction(async (tx) => {
      const queues = await tx.query(
        this.lockQueuePlan(data.queueId)
      );
      const queue = queues[0];
      if (!queue) {
        throw new QueueNotFoundError(data.queueId);
      }
      if (queue.status !== "ACTIVE") {
        if (queue.status === "PAUSED") {
          throw new QueuePausedError(data.queueId);
        }
        throw new QueueNotActiveError(data.queueId, queue.status);
      }

      const tokenRows = await tx.query(
        db.raw.sql`SELECT COALESCE(MAX("tokenNumber"), 0) + 1 AS "nextToken"
          FROM "public"."queueEntry"
          WHERE "queueId" = ${data.queueId}`.returnsRow({
            nextToken: "pg/int4@1",
          }).build()
      );
      const nextToken = tokenRows[0]?.nextToken;
      if (nextToken === undefined) {
        throw new Error(`Unable to allocate a token for queue ${data.queueId}`);
      }

      const now = data.joinedAt.toISOString();
      const entry = await tx.orm.public.QueueEntry.create({
        id: crypto.randomUUID(),
        queueId: data.queueId,
        patientId: data.patientId,
        tokenNumber: nextToken,
        entryType: data.entryType,
        status: data.status,
        joinedAt: now,
      });

      return this.toQueueEntry(entry);
    });
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

  async updateQueueEntryIfStatus(
    entryId: string,
    expectedStatus: QueueEntryStatus,
    data: UpdateQueueEntryInput
  ): Promise<QueueEntry | null> {
    return db.transaction(async (tx) => {
      const entry = await tx.orm.public.QueueEntry.where({ id: entryId }).first();
      if (!entry) {
        return null;
      }

      await tx.query(this.lockQueuePlan(entry.queueId));
      const updated = await tx.orm.public.QueueEntry
        .where({ id: entryId, status: expectedStatus })
        .update({
          ...(data.status !== undefined && { status: data.status }),
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

      return updated ? this.toQueueEntry(updated) : null;
    });
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

  async claimNextWaitingEntry(queueId: string): Promise<QueueEntry | null> {
    return db.transaction(async (tx) => {
      const queues = await tx.query(this.lockQueuePlan(queueId));
      const queue = queues[0];
      if (!queue) {
        throw new QueueNotFoundError(queueId);
      }
      if (queue.status !== "ACTIVE") {
        if (queue.status === "PAUSED") {
          throw new QueuePausedError(queueId);
        }
        throw new QueueNotActiveError(queueId, queue.status);
      }

      const activeEntries = await tx.query(
        db.raw.sql`SELECT "id"
          FROM "public"."queueEntry"
          WHERE "queueId" = ${queueId}
            AND "status" IN ('CALLED', 'IN_CONSULTATION')
          LIMIT 1`.returnsRow({ id: "pg/text@1" }).build()
      );
      if (activeEntries.length > 0) {
        throw new CannotCallNextPatientError();
      }

      const next = await tx.orm.public.QueueEntry
        .where({ queueId, status: "WAITING" })
        .orderBy((entry) => entry.tokenNumber.asc())
        .first();
      if (!next) {
        return null;
      }

      const now = new Date().toISOString();
      const updated = await tx.orm.public.QueueEntry
        .where({ id: next.id, status: "WAITING" })
        .update({ status: "CALLED", calledAt: now });

      return updated ? this.toQueueEntry(updated) : null;
    });
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

  async updateQueueStatusIfStatus(
    queueId: string,
    expectedStatus: QueueStatus,
    status: QueueStatus
  ): Promise<Queue | null> {
    return db.transaction(async (tx) => {
      await tx.query(this.lockQueuePlan(queueId));
      const now = new Date().toISOString();
      const queue = await tx.orm.public.Queue
        .where({ id: queueId, status: expectedStatus })
        .update({
          status,
          updatedAt: now,
          ...(status === "PAUSED" && { pausedAt: now }),
        });

      return queue ? this.toQueue(queue) : null;
    });
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

  private lockQueuePlan(queueId: string) {
    return db.raw.sql`SELECT "id", "status", "currentToken"
      FROM "public"."queue"
      WHERE "id" = ${queueId}
      FOR UPDATE`.returnsRow({
        id: "pg/text@1",
        status: "pg/text@1",
        currentToken: "pg/int4@1",
      }).build();
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