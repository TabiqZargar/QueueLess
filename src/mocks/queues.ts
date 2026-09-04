import { Queue, QueueEntry, QueueEvent, QueueEntryStatus } from "@/types";

export const mockQueues: Queue[] = [
  {
    id: "queue-1",
    clinicId: "clinic-1",
    departmentId: "dept-1",
    doctorId: "doc-1",
    queueDate: new Date("2024-01-20"),
    status: "ACTIVE",
    currentToken: 21,
    startedAt: new Date("2024-01-20T09:00:00"),
    createdAt: new Date("2024-01-20T08:55:00"),
    updatedAt: new Date("2024-01-20T10:30:00"),
  },
  {
    id: "queue-2",
    clinicId: "clinic-1",
    departmentId: "dept-2",
    doctorId: "doc-2",
    queueDate: new Date("2024-01-20"),
    status: "ACTIVE",
    currentToken: 15,
    startedAt: new Date("2024-01-20T09:00:00"),
    createdAt: new Date("2024-01-20T08:55:00"),
    updatedAt: new Date("2024-01-20T10:25:00"),
  },
];

function createMockEntry(
  id: string,
  queueId: string,
  patientId: string,
  tokenNumber: number,
  status: QueueEntryStatus,
  joinedMinutesAgo: number,
  calledMinutesAgo?: number,
  consultationStartedMinutesAgo?: number,
  completedMinutesAgo?: number
): QueueEntry {
  const now = new Date();
  return {
    id,
    queueId,
    patientId,
    tokenNumber,
    entryType: "APPOINTMENT",
    status,
    joinedAt: new Date(now.getTime() - joinedMinutesAgo * 60000),
    calledAt: calledMinutesAgo
      ? new Date(now.getTime() - calledMinutesAgo * 60000)
      : undefined,
    consultationStartedAt: consultationStartedMinutesAgo
      ? new Date(now.getTime() - consultationStartedMinutesAgo * 60000)
      : undefined,
    completedAt: completedMinutesAgo
      ? new Date(now.getTime() - completedMinutesAgo * 60000)
      : undefined,
  };
}

export const mockQueueEntries: QueueEntry[] = [
  createMockEntry("entry-1", "queue-1", "patient-1", 18, "COMPLETED", 120, 80, 75, 68),
  createMockEntry("entry-2", "queue-1", "patient-2", 19, "COMPLETED", 115, 70, 65, 58),
  createMockEntry("entry-3", "queue-1", "patient-3", 20, "COMPLETED", 110, 60, 55, 48),
  createMockEntry("entry-4", "queue-1", "patient-1", 21, "IN_CONSULTATION", 100, 10, 5),
  createMockEntry("entry-5", "queue-1", "patient-2", 22, "WAITING", 95),
  createMockEntry("entry-6", "queue-1", "patient-3", 23, "WAITING", 90),
  createMockEntry("entry-7", "queue-1", "patient-1", 24, "WAITING", 85),
  createMockEntry("entry-8", "queue-1", "patient-2", 25, "WAITING", 80),
  createMockEntry("entry-9", "queue-1", "patient-3", 26, "WAITING", 75),
  createMockEntry("entry-10", "queue-1", "patient-1", 27, "WAITING", 70),
];

export const mockQueueEvents: QueueEvent[] = [
  {
    id: "event-1",
    queueId: "queue-1",
    eventType: "QUEUE_CREATED",
    timestamp: new Date("2024-01-20T08:55:00"),
  },
  {
    id: "event-2",
    queueId: "queue-1",
    queueEntryId: "entry-1",
    eventType: "QUEUE_JOINED",
    timestamp: new Date("2024-01-20T09:00:00"),
  },
  {
    id: "event-3",
    queueId: "queue-1",
    queueEntryId: "entry-4",
    eventType: "PATIENT_CALLED",
    timestamp: new Date("2024-01-20T10:30:00"),
  },
];
