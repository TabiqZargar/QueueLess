"use server";

// Doctor actions reuse the single QueueService consultation workflow.
// Re-exporting keeps one authoritative business implementation while
// giving the doctor experience its own action surface.
export {
  startConsultationAction,
  completeConsultationAction,
} from "@/features/staff/actions";

export type { ActionResult } from "@/features/staff/actions";