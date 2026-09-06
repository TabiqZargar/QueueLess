import { QueueService } from "@/lib/queue/queue-service";
import { QueueStatistics, QueueWithDetails } from "@/lib/queue/repository";
import {
  QueueStatusCounts,
  StaffCurrentPatient,
  StaffWaitListEntry,
} from "@/lib/queue/queue-service";
import { QueueEntryStatus, EntryType } from "@/types";
import { queueService } from "@/lib/queue/instance";

export interface DoctorIdentity {
  name: string;
  department: string;
  clinic: string;
  queueId: string;
}

/**
 * The queue state the doctor is operating in. Kept as the raw
 * domain status so components can render the correct experience.
 */
export type DoctorQueueState = QueueWithDetails["status"];

/**
 * Doctor-facing projection of the patient currently being served. Carries only
 * what the consultation UI needs - never patient ids, contact details or
 * repository internals.
 */
export interface DoctorCurrentPatient {
  entryId: string;
  tokenNumber: number;
  status: QueueEntryStatus;
  patientName: string;
  entryType: EntryType;
  calledAt?: Date;
  consultationStartedAt?: Date;
}

/**
 * Doctor-facing projection of an upcoming waiting patient. Deliberately
 * minimal: the doctor only needs the token, position and ETA to know who is
 * next. patientId / queueId / joinedAt stay behind the server boundary.
 */
export interface DoctorUpcomingEntry {
  entryId: string;
  tokenNumber: number;
  entryType: EntryType;
  position: number;
  estimatedWaitMinutes: number;
}

export interface DoctorDashboardData {
  queue: QueueWithDetails;
  queueStatus: DoctorQueueState;
  identity: DoctorIdentity;
  stats: QueueStatistics;
  counts: QueueStatusCounts;
  currentPatient: DoctorCurrentPatient | null;
  upcoming: DoctorUpcomingEntry[];
}

/**
 * Assembles the doctor dashboard view model using only the public
 * QueueService API so all queue calculations stay in the domain layer.
 * Returns null when the queue does not exist.
 */
export async function getDoctorDashboardData(
  queueId: string,
  service: QueueService = queueService
): Promise<DoctorDashboardData | null> {
  const queue = await service.getQueue(queueId);
  if (!queue) {
    return null;
  }

  const [stats, counts, currentPatient, upcoming] = await Promise.all([
    service.getQueueStats(queueId),
    service.getQueueStatusCounts(queueId),
    service.getCurrentActiveEntry(queueId),
    service.getWaitList(queueId),
  ]);

  return {
    queue,
    queueStatus: queue.status,
    identity: {
      name: queue.doctor?.displayName ?? "Unknown doctor",
      department: queue.departmentName ?? "Unknown department",
      clinic: queue.clinicName ?? "Unknown clinic",
      queueId: queue.id,
    },
    stats,
    counts,
    currentPatient: currentPatient
      ? toDoctorCurrentPatient(currentPatient)
      : null,
    upcoming: upcoming.map(toDoctorUpcomingEntry),
  };
}

function toDoctorCurrentPatient(
  patient: StaffCurrentPatient
): DoctorCurrentPatient {
  return {
    entryId: patient.entryId,
    tokenNumber: patient.tokenNumber,
    status: patient.status,
    patientName: patient.patientName,
    entryType: patient.entryType,
    calledAt: patient.calledAt,
    consultationStartedAt: patient.consultationStartedAt,
  };
}

function toDoctorUpcomingEntry(entry: StaffWaitListEntry): DoctorUpcomingEntry {
  return {
    entryId: entry.entryId,
    tokenNumber: entry.tokenNumber,
    entryType: entry.entryType,
    position: entry.position,
    estimatedWaitMinutes: entry.estimatedWaitMinutes,
  };
}