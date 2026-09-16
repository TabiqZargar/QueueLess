import type { QueueStatus } from "@/types";
import type { QueueWithDetails } from "@/lib/queue/repository";

export interface JoinableQueueCardStats {
  totalWaiting: number;
  estimatedWaitMinutes: number;
  currentToken: number | null;
}

export interface JoinableQueueCard {
  id: string;
  status: QueueStatus;
  departmentName?: string;
  doctorName?: string;
  clinicName?: string;
  averageConsultationMinutes?: number;
  stats?: JoinableQueueCardStats;
}

export const DEFAULT_DEPARTMENT_LABEL = "Open Queue";
export const DEFAULT_DOCTOR_LABEL = "Available for consultation";

export function displayDepartmentName(card: JoinableQueueCard): string {
  return card.departmentName ?? DEFAULT_DEPARTMENT_LABEL;
}

export function displayDoctorName(card: JoinableQueueCard): string {
  return card.doctorName ?? DEFAULT_DOCTOR_LABEL;
}

export function buildJoinableQueueCards(
  queues: readonly QueueWithDetails[],
  statsByQueue: ReadonlyMap<string, JoinableQueueCardStats>
): JoinableQueueCard[] {
  return queues.map((q) => ({
    id: q.id,
    status: q.status,
    departmentName: q.departmentName,
    doctorName: q.doctor?.displayName,
    clinicName: q.clinicName,
    averageConsultationMinutes: q.doctor?.averageConsultationMinutes,
    stats: statsByQueue.get(q.id),
  }));
}
