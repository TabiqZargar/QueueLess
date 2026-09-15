import {
  Doctor,
  Patient,
  Queue,
  QueueEntry,
  QueueEntryStatus,
  QueueEvent,
  QueueStatus,
} from "@/types";

/**
 * Entry statuses that represent an active, unresolved patient journey.
 * Used by `getActiveEntriesForPatient` to scope recovery queries.
 */
export const NON_TERMINAL_ENTRY_STATUSES: QueueEntryStatus[] = [
  "REGISTERED",
  "WAITING",
  "CALLED",
  "IN_CONSULTATION",
];

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

  listQueues(): Promise<QueueWithDetails[]>;

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

  /**
   * Returns all non-terminal entries for a given patient, ordered newest first.
   * The patientId is the application-level patient identifier (typically the
   * same as the authenticated user id in mock auth).
   */
  getActiveEntriesForPatient(patientId: string): Promise<QueueEntry[]>;

  /** Optional database-backed atomic operations. */
  joinQueueAtomic?(data: CreateQueueEntryInput): Promise<QueueEntry>;

  claimNextWaitingEntry?(queueId: string): Promise<QueueEntry | null>;

  updateQueueEntryIfStatus?(
    entryId: string,
    expectedStatus: QueueEntryStatus,
    data: UpdateQueueEntryInput
  ): Promise<QueueEntry | null>;

  updateQueueStatusIfStatus?(
    queueId: string,
    expectedStatus: QueueStatus,
    status: QueueStatus
  ): Promise<Queue | null>;
}
