"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffCurrentPatientVM } from "../get-staff-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import {
  markNoShowAction,
  type ActionResult,
} from "../actions";
import { FeedbackMessage, type Feedback } from "@/components/feedback-message";

type PendingAction = "noShow" | null;

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
        className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
        aria-labelledby="current-patient-heading"
      >
        <PanelHeader />
        <div className="px-6 py-10 text-center text-body-sm text-on-surface-variant">
          <Icon name="support_agent" size="xl" className="mx-auto text-outline" />
          <p className="mt-3 font-medium text-on-surface">
            No patient currently being served.
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Estimated wait for waiting patients:{" "}
            {formatWaitTime(estimatedWaitMinutes)}.
          </p>
        </div>
      </section>
    );
  }

  const statusLabel =
    currentPatient.status === "CALLED" ? "Called" : "In consultation";
  const statusVariant =
    currentPatient.status === "CALLED" ? "warning" : "info";

  return (
    <section
      className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
      aria-labelledby="current-patient-heading"
    >
      <PanelHeader />
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-headline-lg text-primary-700">
              {formatQueueToken(currentPatient.tokenNumber)}
            </p>
            <p className="mt-1 text-body-md font-medium text-on-surface">
              {currentPatient.patientName}
            </p>
            <p className="mt-0.5 text-label-sm text-on-surface-variant">
              {currentPatient.entryType === "WALK_IN" ? "Walk-in" : "Appointment"}
            </p>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>

        <div className="mt-6 space-y-2">
          {currentPatient.status === "CALLED" && (
            <div className="space-y-2">
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
                <div
                  className="rounded-xl border border-danger-200 bg-error-container p-4"
                  role="group"
                  aria-label="Confirm no-show"
                >
                  <p className="text-body-sm font-medium text-on-error-container">
                    Mark {formatQueueToken(currentPatient.tokenNumber)} as
                    no-show?
                  </p>
                  <p className="mt-1 text-label-sm text-on-error-container/80">
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
            <p className="rounded-xl bg-surface-container p-3 text-center text-body-sm text-on-surface-variant">
              Consultation in progress - managed from the doctor dashboard.
            </p>
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

function PanelHeader() {
  return (
    <div className="border-b border-outline-variant px-6 py-4">
      <h2
        id="current-patient-heading"
        className="text-headline-sm text-on-surface"
      >
        Current Patient
      </h2>
    </div>
  );
}