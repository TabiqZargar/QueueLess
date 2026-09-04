import { queueService } from "@/lib/queue/instance";
import { QueueService } from "@/lib/queue/queue-service";

export interface PatientStatusData {
  queueId: string;
  entryId: string;
  tokenNumber: number;
  entryStatus: string;
  doctorName?: string;
  departmentName?: string;
  clinicName?: string;
  queueStatus: "ACTIVE" | "PAUSED" | "CLOSED";
  position: number;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  currentServingToken: number | null;
  totalInQueue: number;
  entryNotFound: boolean;
  queueNotFound: boolean;
}

const NOT_FOUND: PatientStatusData = {
  queueId: "",
  entryId: "",
  tokenNumber: 0,
  entryStatus: "",
  queueStatus: "CLOSED",
  position: 0,
  patientsAhead: 0,
  estimatedWaitMinutes: 0,
  currentServingToken: null,
  totalInQueue: 0,
  entryNotFound: true,
  queueNotFound: false,
};

/**
 * Assembles the personal queue-status view model for a patient's entry using
 * only the public QueueService API. A missing entry or queue resolves to an
 * `entryNotFound`/`queueNotFound` variant (giving the UI a recovery path)
 * rather than throwing.
 */
export async function getPatientStatus(
  entryId: string,
  service: QueueService = queueService
): Promise<PatientStatusData> {
  const entry = await service.getQueueEntry(entryId);
  if (!entry) {
    return NOT_FOUND;
  }

  const queue = await service.getQueue(entry.queueId);
  if (!queue) {
    return { ...NOT_FOUND, entryId, queueId: entry.queueId, queueNotFound: true };
  }

  const position = await service.getQueuePosition(entryId);

  return {
    queueId: entry.queueId,
    entryId,
    tokenNumber: entry.tokenNumber,
    entryStatus: entry.status,
    doctorName: queue.doctor?.displayName,
    departmentName: queue.departmentName,
    clinicName: queue.clinicName,
    queueStatus: mapQueueStatus(queue.status),
    position: position.position,
    patientsAhead: position.patientsAhead,
    estimatedWaitMinutes: position.estimatedWaitMinutes,
    currentServingToken:
      position.currentServingToken > 0 ? position.currentServingToken : null,
    totalInQueue: position.totalInQueue,
    entryNotFound: false,
    queueNotFound: false,
  };
}

function mapQueueStatus(
  status: string
): "ACTIVE" | "PAUSED" | "CLOSED" {
  if (status === "PAUSED") return "PAUSED";
  if (status === "ACTIVE") return "ACTIVE";
  return "CLOSED";
}
