import { QueueEntry } from "@/types";

const ACTIVE_STATUSES: QueueEntry["status"][] = [
  "WAITING",
  "CALLED",
];

export function countPatientsAhead(
  entries: QueueEntry[],
  targetEntryId: string
): number {
  const targetEntry = entries.find((e) => e.id === targetEntryId);
  if (!targetEntry) return -1;

  return entries.filter(
    (e) =>
      e.id !== targetEntryId &&
      ACTIVE_STATUSES.includes(e.status) &&
      e.tokenNumber < targetEntry.tokenNumber
  ).length;
}

export function calculateQueuePosition(
  entries: QueueEntry[],
  targetEntryId: string
): number {
  const patientsAhead = countPatientsAhead(entries, targetEntryId);
  return patientsAhead >= 0 ? patientsAhead + 1 : -1;
}

export function calculateEstimatedWait(
  patientsAhead: number,
  averageConsultationMinutes: number
): number {
  if (patientsAhead < 0 || averageConsultationMinutes < 0) {
    return 0;
  }
  return patientsAhead * averageConsultationMinutes;
}

export function getCurrentServingToken(entries: QueueEntry[]): number | null {
  const inConsultation = entries
    .filter((e) => e.status === "IN_CONSULTATION" || e.status === "CALLED")
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  if (inConsultation.length === 0) {
    const completed = entries
      .filter((e) => e.status === "COMPLETED")
      .sort((a, b) => b.tokenNumber - a.tokenNumber);

    return completed.length > 0 ? completed[0].tokenNumber : null;
  }

  return inConsultation[0].tokenNumber;
}

export function countWaiting(entries: QueueEntry[]): number {
  return entries.filter((e) => e.status === "WAITING").length;
}
