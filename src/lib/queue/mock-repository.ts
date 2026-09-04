import {
  Doctor,
  Patient,
  Queue,
  QueueEntry,
  QueueEvent,
  QueueEventType,
} from "@/types";
import {
  QueueRepository,
  CreateQueueEntryInput,
  UpdateQueueEntryInput,
  QueueStatistics,
  QueueWithDetails,
} from "./repository";
import { mockDepartments, mockDoctors, mockPatients } from "@/mocks/clinics";
import { mockClinics } from "@/mocks/clinics";
import {
  mockQueueEntries,
  mockQueueEvents,
  mockQueues,
} from "@/mocks/queues";
import { calculateEstimatedWait, countWaiting } from "./calculations";

export class MockQueueRepository implements QueueRepository {
  private queues: Queue[];
  private entries: QueueEntry[];
  private events: QueueEvent[];
  private doctors: Doctor[];
  private patients: Patient[];

  private nextQueueEntryId = 1000;
  private nextEventId = 1000;

  constructor() {
    this.queues = clone(mockQueues);
    this.entries = clone(mockQueueEntries);
    this.events = clone(mockQueueEvents);
    this.doctors = clone(mockDoctors);
    this.patients = clone(mockPatients);
  }

  async getQueue(queueId: string): Promise<Queue | null> {
    return this.queues.find((q) => q.id === queueId) ?? null;
  }

  async getQueueWithDetails(queueId: string): Promise<QueueWithDetails | null> {
    const queue = this.queues.find((q) => q.id === queueId);
    if (!queue) return null;

    const doctor =
      this.doctors.find((d) => d.id === queue.doctorId) ?? undefined;
    const department = mockDepartments.find(
      (d) => d.id === queue.departmentId
    );
    const clinic = mockClinics.find((c) => c.id === queue.clinicId);

    return {
      ...queue,
      doctor,
      departmentName: department?.name,
      clinicName: clinic?.name,
    };
  }

  async getQueueEntries(queueId: string): Promise<QueueEntry[]> {
    return this.entries
      .filter((e) => e.queueId === queueId)
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  }

  async getQueueEntry(entryId: string): Promise<QueueEntry | null> {
    return this.entries.find((e) => e.id === entryId) ?? null;
  }

  async findEntryByToken(
    queueId: string,
    tokenNumber: number
  ): Promise<QueueEntry | null> {
    return (
      this.entries.find(
        (e) => e.queueId === queueId && e.tokenNumber === tokenNumber
      ) ?? null
    );
  }

  async createQueueEntry(data: CreateQueueEntryInput): Promise<QueueEntry> {
    const entry: QueueEntry = {
      id: `entry-${this.nextQueueEntryId++}`,
      queueId: data.queueId,
      patientId: data.patientId,
      tokenNumber: data.tokenNumber,
      entryType: data.entryType,
      status: data.status,
      joinedAt: data.joinedAt,
    };
    this.entries.push(entry);
    return entry;
  }

  async updateQueueEntry(
    entryId: string,
    data: UpdateQueueEntryInput
  ): Promise<QueueEntry> {
    const index = this.entries.findIndex((e) => e.id === entryId);
    if (index === -1) {
      throw new Error(`Queue entry not found: ${entryId}`);
    }
    this.entries[index] = {
      ...this.entries[index],
      ...data,
    };
    return this.entries[index];
  }

  async getNextWaitingEntry(queueId: string): Promise<QueueEntry | null> {
    const waiting = this.entries
      .filter((e) => e.queueId === queueId && e.status === "WAITING")
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
    return waiting[0] ?? null;
  }

  async updateQueueStatus(
    queueId: string,
    status: Queue["status"]
  ): Promise<Queue> {
    const index = this.queues.findIndex((q) => q.id === queueId);
    if (index === -1) {
      throw new Error(`Queue not found: ${queueId}`);
    }
    this.queues[index] = {
      ...this.queues[index],
      status,
      updatedAt: new Date(),
      pausedAt: status === "PAUSED" ? new Date() : this.queues[index].pausedAt,
    };
    return this.queues[index];
  }

  async getDoctor(doctorId: string): Promise<Doctor | null> {
    return this.doctors.find((d) => d.id === doctorId) ?? null;
  }

  async getPatient(patientId: string): Promise<Patient | null> {
    return this.patients.find((p) => p.id === patientId) ?? null;
  }

  async getQueueStatistics(queueId: string): Promise<QueueStatistics> {
    const queue = this.queues.find((q) => q.id === queueId);
    if (!queue) {
      throw new Error(`Queue not found: ${queueId}`);
    }
    const queueEntries = await this.getQueueEntries(queueId);
    const doctor = this.doctors.find((d) => d.id === queue.doctorId);
    const averageConsultationMinutes =
      doctor?.averageConsultationMinutes ?? 5;

    const totalWaiting = countWaiting(queueEntries);
    const estimatedWaitMinutes = calculateEstimatedWait(
      totalWaiting,
      averageConsultationMinutes
    );

    const active = queueEntries
      .filter((e) => e.status === "IN_CONSULTATION")
      .sort((a, b) => a.tokenNumber - b.tokenNumber);

    const completed = queueEntries
      .filter((e) => e.status === "COMPLETED")
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
      totalInQueue: queueEntries.length,
    };
  }

  async addQueueEvent(
    event: Omit<QueueEvent, "id" | "timestamp">
  ): Promise<QueueEvent> {
    const newEvent: QueueEvent = {
      ...event,
      id: `event-${this.nextEventId++}`,
      timestamp: new Date(),
    };
    this.events.push(newEvent);
    return newEvent;
  }

  async getQueueEvents(queueId: string): Promise<QueueEvent[]> {
    return this.events
      .filter((e) => e.queueId === queueId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

function clone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (Array.isArray(value)) {
    return value.map(clone) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = clone(
        (value as Record<string, unknown>)[key]
      );
    }
    return result as T;
  }
  return value;
}
