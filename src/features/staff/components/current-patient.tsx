"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffCurrentPatientVM } from "../get-staff-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import {
  completeConsultationAction,
  markNoShowAction,
  startConsultationAction,
  type ActionResult,
} from "../actions";
import { FeedbackMessage, type Feedback } from "@/components/feedback-message";

type PendingAction = "start" | "complete" | "noShow" | null;

interface CurrentPatientPanelProps {
  currentPatient: StaffCurrentPatientVM | null;
  estimatedWaitMinutes: number;
}

export function CurrentPatientPanel({
  currentPatient,
  estimatedWaitMinutes,
}: CurrentPatientPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [confirmingNoShow, setConfirmingNoShow] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function runAction(
    actionName: PendingAction,
    action: () => Promise<ActionResult>
  ) {
    setPending(actionName);
    setFeedback(null);
    const result = await action();
    setPending(null);
    setConfirmingNoShow(false);
    if (result.error) {
      setFeedback({ kind: "error", text: result.error });
      return;
    }
    setFeedback({ kind: "success", text: result.message ?? "Done." });
    router.refresh();
  }

  if (!currentPatient) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="current-patient-heading">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 id="current-patient-heading" className="text-lg font-semibold text-gray-900">
            Current Patient
          </h2>
        </div>
        <div className="px-6 py-8 text-center text-sm text-gray-500">
          <p>No patient currently being served.</p>
          <p className="mt-1 text-xs text-gray-400">
            Estimated wait for waiting patients: {formatWaitTime(estimatedWaitMinutes)}.
          </p>
        </div>
      </section>
    );
  }

  const statusLabel = currentPatient.status === "CALLED" ? "Called" : "In consultation";
  const statusVariant = currentPatient.status === "CALLED" ? "warning" : "info";

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="current-patient-heading">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 id="current-patient-heading" className="text-lg font-semibold text-gray-900">
          Current Patient
        </h2>
      </div>
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {formatQueueToken(currentPatient.tokenNumber)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {currentPatient.patientName}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {currentPatient.entryType === "WALK_IN" ? "Walk-in" : "Appointment"}
            </p>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>

        <div className="mt-6 space-y-2">
          {currentPatient.status === "CALLED" && (
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={pending !== null}
                onClick={() =>
                  runAction("start", () =>
                    startConsultationAction(currentPatient.entryId)
                  )
                }
              >
                {pending === "start" ? "Starting..." : "Start Consultation"}
              </Button>

              {!confirmingNoShow ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={pending !== null}
                  onClick={() => setConfirmingNoShow(true)}
                >
                  Mark No-Show
                </Button>
              ) : (
                <div className="rounded-lg border border-danger-200 bg-danger-50 p-4" role="group" aria-label="Confirm no-show">
                  <p className="text-sm font-medium text-danger-800">
                    Mark {formatQueueToken(currentPatient.tokenNumber)} as no-show?
                  </p>
                  <p className="mt-1 text-xs text-danger-700">
                    This will remove the patient from the active queue.
                  </p>
                  <div className="mt-3 flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={pending !== null}
                      onClick={() => setConfirmingNoShow(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      disabled={pending !== null}
                      onClick={() =>
                        runAction("noShow", () =>
                          markNoShowAction(currentPatient.entryId)
                        )
                      }
                    >
                      {pending === "noShow" ? "Marking..." : "Confirm No-Show"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPatient.status === "IN_CONSULTATION" && (
            <Button
              className="w-full"
              disabled={pending !== null}
              onClick={() =>
                runAction("complete", () =>
                  completeConsultationAction(currentPatient.entryId)
                )
              }
            >
              {pending === "complete" ? "Completing..." : "Complete Consultation"}
            </Button>
          )}
        </div>

        {feedback && (
          <div className="mt-4">
            <FeedbackMessage feedback={feedback} />
          </div>
        )}
      </div>
    </section>
  );
}