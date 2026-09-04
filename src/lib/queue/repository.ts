import {
  Doctor,
  Patient,
  Queue,
  QueueEntry,
  QueueEntryStatus,
  QueueEvent,
  QueueStatus,
} from "@/types";

export interface QueueWithDetails extends Queue {
  doctor?: Doctor;
  departmentName?: string;
  clinicName?: string;
}

export interface QueueStatistics {
  totalWaiting: number;
  currentToken: number | null;
  averageConsultationMinutes: number;
  estimatedWaitMinutes: number;
  totalInQueue: number;
}

export interface CreateQueueEntryInput {
  queueId: string;
  patientId: string;
  tokenNumber: number;
  entryType: "APPOINTMENT" | "WALK_IN";
  status: QueueEntryStatus;
  joinedAt: Date;
}

export interface UpdateQueueEntryInput {
  status?: QueueEntryStatus;
  calledAt?: Date;
  consultationStartedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface QueueRepository {
  getQueue(queueId: string): Promise<Queue | null>;

  getQueueWithDetails(queueId: string): Promise<QueueWithDetails | null>;

  getQueueEntries(queueId: string): Promise<QueueEntry[]>;

  getQueueEntry(entryId: string): Promise<QueueEntry | null>;

  findEntryByToken(queueId: string, tokenNumber: number): Promise<QueueEntry | null>;

  createQueueEntry(data: CreateQueueEntryInput): Promise<QueueEntry>;

  updateQueueEntry(
    entryId: string,
    data: UpdateQueueEntryInput
  ): Promise<QueueEntry>;

  getNextWaitingEntry(queueId: string): Promise<QueueEntry | null>;

  updateQueueStatus(queueId: string, status: QueueStatus): Promise<Queue>;

  getDoctor(doctorId: string): Promise<Doctor | null>;

  getPatient(patientId: string): Promise<Patient | null>;

  getQueueStatistics(queueId: string): Promise<QueueStatistics>;

  addQueueEvent(event: Omit<QueueEvent, "id" | "timestamp">): Promise<QueueEvent>;

  getQueueEvents(queueId: string): Promise<QueueEvent[]>;
}
