import { QueueService } from "@/lib/queue/queue-service";
import {
  QueueStatistics,
  QueueWithDetails,
} from "@/lib/queue/repository";
import { queueService } from "@/lib/queue/instance";
import { formatQueueToken } from "@/lib/utils";
import { QueueEvent, QueueEventType } from "@/types";

export interface QueueActivityItem {
  id: string;
  eventType: QueueEventType;
  label: string;
  token?: string;
  timestamp: Date;
}

export interface StaffStatusCounts {
  waiting: number;
  called: number;
  inConsultation: number;
  completed: number;
  noShow: number;
  cancelled: number;
}

export interface StaffCurrentPatientVM {
  entryId: string;
  tokenNumber: number;
  status: string;
  patientName: string;
  entryType?: string;
}

export interface StaffWaitListVM {
  entryId: string;
  patientName: string;
  tokenNumber: number;
  entryType: string;
  position: number;
  estimatedWaitMinutes: number;
}

export interface StaffDashboardData {
  queue: QueueWithDetails;
  queueStatus: QueueWithDetails["status"];
  stats: QueueStatistics;
  counts: StaffStatusCounts;
  currentPatient: StaffCurrentPatientVM | null;
  waitList: StaffWaitListVM[];
  activity: QueueActivityItem[];
}

const EVENT_LABELS: Record<QueueEventType, string> = {
  QUEUE_CREATED: "Queue created",
  PATIENT_REGISTERED: "Patient registered",
  QUEUE_JOINED: "Joined the queue",
  PATIENT_CALLED: "Called",
  CONSULTATION_STARTED: "Consultation started",
  CONSULTATION_COMPLETED: "Consultation completed",
  PATIENT_NO_SHOW: "Marked no-show",
  PATIENT_CANCELLED: "Cancelled",
  WALK_IN_ADDED: "Walk-in added",
  QUEUE_PAUSED: "Queue paused",
  QUEUE_RESUMED: "Queue resumed",
  DOCTOR_DELAYED: "Doctor delayed",
};

/**
 * Assembles the staff dashboard view model using only the public
 * QueueService API so all queue calculations stay in the domain layer.
 * Returns null when the queue does not exist.
 */
export async function getStaffDashboardData(
  queueId: string,
  service: QueueService = queueService
): Promise<StaffDashboardData | null> {
  const queue = await service.getQueue(queueId);
  if (!queue) {
    return null;
  }

  const [stats, counts, currentPatient, waitList, activity] =
    await Promise.all([
      service.getQueueStats(queueId),
      service.getQueueStatusCounts(queueId),
      service.getCurrentActiveEntry(queueId),
      service.getWaitList(queueId),
      getQueueActivity(queueId, service),
    ]);

  return {
    queue,
    queueStatus: queue.status,
    stats,
    counts,
    currentPatient: currentPatient
      ? {
          entryId: currentPatient.entryId,
          tokenNumber: currentPatient.tokenNumber,
          status: currentPatient.status,
          patientName: currentPatient.patientName,
          entryType: currentPatient.entryType,
        }
      : null,
    waitList: waitList.map((entry) => ({
      entryId: entry.entryId,
      patientName: entry.patientName,
      tokenNumber: entry.tokenNumber,
      entryType: entry.entryType,
      position: entry.position,
      estimatedWaitMinutes: entry.estimatedWaitMinutes,
    })),
    activity,
  };
}

async function getQueueActivity(
  queueId: string,
  service: QueueService
): Promise<QueueActivityItem[]> {
  const events: QueueEvent[] = await service.getQueueEvents(queueId);
  const items: QueueActivityItem[] = [];

  for (const event of events) {
    let token: string | undefined;
    if (event.queueEntryId) {
      const entry = await service.getQueueEntry(event.queueEntryId);
      if (entry) {
        token = formatQueueToken(entry.tokenNumber);
      }
    }
    items.push({
      id: event.id,
      eventType: event.eventType,
      label: EVENT_LABELS[event.eventType] ?? event.eventType,
      token,
      timestamp: event.timestamp,
    });
  }

  // Most recent first
  return items.reverse();
}