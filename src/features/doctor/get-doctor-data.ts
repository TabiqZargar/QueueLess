import { QueueService } from "@/lib/queue/queue-service";
import { QueueStatistics, QueueWithDetails } from "@/lib/queue/repository";
import {
  QueueStatusCounts,
  StaffCurrentPatient,
  StaffWaitListEntry,
} from "@/lib/queue/queue-service";
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

export interface DoctorDashboardData {
  queue: QueueWithDetails;
  queueStatus: DoctorQueueState;
  identity: DoctorIdentity;
  stats: QueueStatistics;
  counts: QueueStatusCounts;
  currentPatient: StaffCurrentPatient | null;
  upcoming: StaffWaitListEntry[];
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
    currentPatient,
    upcoming,
  };
}