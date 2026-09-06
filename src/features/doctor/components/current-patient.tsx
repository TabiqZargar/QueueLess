"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatQueueToken } from "@/lib/utils";
import {
  completeConsultationAction,
  startConsultationAction,
  type ActionResult,
} from "../actions";
import { FeedbackMessage, type Feedback } from "@/components/feedback-message";
import type { DoctorCurrentPatient, DoctorQueueState } from "../get-doctor-data";

type PendingAction = "start" | "complete" | null;

interface CurrentPatientProps {
  currentPatient: DoctorCurrentPatient | null;
  queueStatus: DoctorQueueState;
}

function minutesAgo(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function formatElapsed(date: Date): string {
  const minutes = minutesAgo(date);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ${minutes % 60} min ago`;
}

export function CurrentPatientCard({
  currentPatient,
  queueStatus,
}: CurrentPatientProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function runAction(
    actionName: PendingAction,
    action: () => Promise<ActionResult>
  ) {
    setPending(actionName);
    setFeedback(null);
    const result = await action();
    setPending(null);
    if (!result.success) {
      setFeedback({ kind: "error", text: result.error });
      return;
    }
    setFeedback({ kind: "success", text: result.message ?? "Done." });
    router.refresh();
  }

  if (!currentPatient) {
    return (
      <section
        className="rounded-xl border border-gray-200 bg-white shadow-sm"
        aria-labelledby="doctor-current-patient-heading"
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2
            id="doctor-current-patient-heading"
            className="text-lg font-semibold text-gray-900"
          >
            Current Patient
          </h2>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-base font-medium text-gray-700">
            No patient currently assigned.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Waiting for the next patient to be called.
          </p>
        </div>
      </section>
    );
  }

  const isCalled = currentPatient.status === "CALLED";
  const statusLabel = isCalled ? "Called" : "In consultation";
  const statusVariant = isCalled ? "warning" : "info";

  // A new consultation is only started during normal operations. An
  // in-progress consultation can always be completed, even while paused.
  const canStart = queueStatus === "ACTIVE";
  const canComplete = queueStatus === "ACTIVE" || queueStatus === "PAUSED";

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
      aria-labelledby="doctor-current-patient-heading"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2
          id="doctor-current-patient-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Current Patient
        </h2>
      </div>
      <div className="px-6 py-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-gray-900">
                {formatQueueToken(currentPatient.tokenNumber)}
              </span>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <p className="mt-2 text-base font-medium text-gray-700">
              {currentPatient.patientName}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              {isCalled
                ? currentPatient.calledAt
                  ? `Called ${formatElapsed(currentPatient.calledAt)}`
                  : "Ready for consultation"
                : currentPatient.consultationStartedAt
                  ? `Consultation started ${formatElapsed(currentPatient.consultationStartedAt)}`
                  : "Consultation in progress"}
            </p>
          </div>

          <div className="w-full sm:w-56 sm:shrink-0">
            {currentPatient.status === "CALLED" && canStart && (
              <Button
                className="w-full"
                size="lg"
                disabled={pending !== null}
                onClick={() =>
                  runAction("start", () =>
                    startConsultationAction(currentPatient.entryId)
                  )
                }
              >
                {pending === "start"
                  ? "Starting consultation..."
                  : "Start Consultation"}
              </Button>
            )}

            {currentPatient.status === "CALLED" && !canStart && (
              <p className="text-sm text-gray-500">
                Queue is paused. Starting a consultation is available once staff
                resume operations.
              </p>
            )}

            {currentPatient.status === "IN_CONSULTATION" && canComplete && (
              <Button
                className="w-full"
                size="lg"
                disabled={pending !== null}
                onClick={() =>
                  runAction("complete", () =>
                    completeConsultationAction(currentPatient.entryId)
                  )
                }
              >
                {pending === "complete"
                  ? "Completing consultation..."
                  : "Complete Consultation"}
              </Button>
            )}

            {currentPatient.status === "IN_CONSULTATION" && !canComplete && (
              <p className="text-sm text-gray-500">
                This queue is no longer active. No consultation actions are
                available.
              </p>
            )}
          </div>
        </div>

        {feedback && (
          <div className="mt-5">
            <FeedbackMessage feedback={feedback} />
          </div>
        )}
      </div>
    </section>
  );
}