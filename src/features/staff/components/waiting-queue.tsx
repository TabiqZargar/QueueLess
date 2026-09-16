"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffWaitListVM } from "../get-staff-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import {
  callNextPatientAction,
  cancelEntryAction,
  markNoShowAction,
  type ActionResult,
} from "../actions";
import { FeedbackMessage, type Feedback } from "@/components/feedback-message";

type PendingAction = "call" | "noShow" | "cancel" | null;

interface WaitingQueueCardProps {
  waitList: StaffWaitListVM[];
  queueId: string;
  queueActive: boolean;
}

export function WaitingQueueCard({
  waitList,
  queueId,
  queueActive,
}: WaitingQueueCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [confirming, setConfirming] = useState<
    { entryId: string; action: "noShow" | "cancel" } | null
  >(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function runAction(
    actionName: PendingAction,
    action: () => Promise<ActionResult>
  ) {
    setPending(actionName);
    setFeedback(null);
    setConfirming(null);
    const result = await action();
    setPending(null);
    if (!result.success) {
      setFeedback({ kind: "error", text: result.error });
      return;
    }
    setFeedback({ kind: "success", text: result.message ?? "Done." });
    router.refresh();
  }

  return (
    <section
      className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
      aria-labelledby="waiting-queue-heading"
    >
      <div className="flex flex-col gap-3 border-b border-outline-variant px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="waiting-queue-heading"
            className="text-headline-sm text-on-surface"
          >
            Waiting Queue
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {waitList.length} waiting
            {waitList[0]
              ? ` · next up ${formatQueueToken(waitList[0].tokenNumber)}`
              : ""}
          </p>
        </div>
        <Button
          disabled={!queueActive || waitList.length === 0 || pending !== null}
          onClick={() => runAction("call", () => callNextPatientAction(queueId))}
        >
          {pending === "call" ? "Calling..." : "Call Next Patient"}
        </Button>
      </div>

      <div className="px-6 py-4">
        {!queueActive && (
          <p className="mb-4 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-body-sm text-warning-800">
            Queue is not active. New patients cannot be called until the queue
            is active.
          </p>
        )}

        {feedback && (
          <div className="mb-4">
            <FeedbackMessage feedback={feedback} />
          </div>
        )}

        {waitList.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-body-sm text-on-surface-variant">
              No patients are currently waiting.
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant/70">
              Use “Add Walk-in” to register a new patient, or wait for the next
              join.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {waitList.map((entry) => (
              <li
                key={entry.entryId}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-16 shrink-0 text-headline-md font-bold text-on-surface">
                    {formatQueueToken(entry.tokenNumber)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-md font-medium text-on-surface">
                      {entry.patientName}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      Position {entry.position} ·{" "}
                      {formatWaitTime(entry.estimatedWaitMinutes)}
                      {entry.entryType === "WALK_IN" && (
                        <Badge variant="info" className="ml-2">
                          Walk-in
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {confirming?.entryId === entry.entryId ? (
                    <div
                      className="rounded-xl border border-danger-200 bg-error-container p-3"
                      role="group"
                      aria-label={`Confirm ${confirming.action} for ${formatQueueToken(entry.tokenNumber)}`}
                    >
                      <p className="text-label-sm font-medium text-on-error-container">
                        {confirming.action === "noShow"
                          ? `Mark ${formatQueueToken(entry.tokenNumber)} as no-show?`
                          : `Cancel ${formatQueueToken(entry.tokenNumber)}?`}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pending !== null}
                          onClick={() => setConfirming(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={pending !== null}
                          onClick={() =>
                            confirming.action === "noShow"
                              ? runAction("noShow", () =>
                                  markNoShowAction(entry.entryId)
                                )
                              : runAction("cancel", () =>
                                  cancelEntryAction(entry.entryId)
                                )
                          }
                        >
                          {pending
                            ? confirming.action === "noShow"
                              ? "Marking..."
                              : "Cancelling..."
                            : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending !== null}
                        onClick={() =>
                          setConfirming({
                            entryId: entry.entryId,
                            action: "noShow",
                          })
                        }
                      >
                        No-Show
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending !== null}
                        onClick={() =>
                          setConfirming({
                            entryId: entry.entryId,
                            action: "cancel",
                          })
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}