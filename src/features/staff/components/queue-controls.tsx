"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QueueStatus } from "@/types";
import { addWalkInAction, pauseQueueAction, resumeQueueAction, type ActionResult } from "../actions";
import { FeedbackMessage, type Feedback } from "@/components/feedback-message";

type PendingAction = "pause" | "resume" | "walkIn" | null;

interface QueueControlsCardProps {
  queueId: string;
  queueStatus: QueueStatus;
}

export function QueueControlsCard({
  queueId,
  queueStatus,
}: QueueControlsCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

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

  async function handleWalkIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    setPending("walkIn");
    const result = await addWalkInAction({
      queueId,
      name: walkInName,
      phone: walkInPhone || undefined,
    });
    setPending(null);
    if (!result.success) {
      setFeedback({ kind: "error", text: result.error });
      return;
    }
    setWalkInName("");
    setWalkInPhone("");
    setShowWalkIn(false);
    setFeedback({ kind: "success", text: result.message ?? "Walk-in added." });
    router.refresh();
  }

  const isActive = queueStatus === "ACTIVE";
  const isPaused = queueStatus === "PAUSED";

  return (
    <section
      className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
      aria-labelledby="queue-controls-heading"
    >
      <div className="border-b border-outline-variant px-6 py-4">
        <h2
          id="queue-controls-heading"
          className="text-headline-sm text-on-surface"
        >
          Queue Controls
        </h2>
      </div>

      <div className="space-y-4 px-6 py-4">
        {isPaused && (
          <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3">
            <p className="text-body-sm font-medium text-warning-800">
              Queue is currently paused.
            </p>
            <p className="mt-1 text-body-sm text-warning-700">
              New patients cannot join until the queue is resumed.
            </p>
          </div>
        )}

        <div>
          {isActive ? (
            <Button
              variant="secondary"
              className="w-full"
              disabled={pending !== null}
              onClick={() => runAction("pause", () => pauseQueueAction(queueId))}
            >
              {pending === "pause" ? "Pausing..." : "Pause Queue"}
            </Button>
          ) : isPaused ? (
            <Button
              className="w-full"
              disabled={pending !== null}
              onClick={() => runAction("resume", () => resumeQueueAction(queueId))}
            >
              {pending === "resume" ? "Resuming..." : "Resume Queue"}
            </Button>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              This queue is not active and cannot be modified.
            </p>
          )}
        </div>

        <div className="border-t border-outline-variant pt-4">
          <Button
            variant="secondary"
            className="w-full"
            disabled={!isActive || pending !== null}
            aria-expanded={showWalkIn}
            aria-controls="walk-in-form"
            onClick={() => {
              setShowWalkIn((v) => !v);
              setFeedback(null);
            }}
          >
            {showWalkIn ? "Close Walk-in Form" : "Add Walk-in"}
          </Button>

          {showWalkIn && (
            <form
              id="walk-in-form"
              onSubmit={handleWalkIn}
              className="mt-4 space-y-3 rounded-xl border border-outline-variant bg-surface-container p-4"
              aria-label="Add walk-in patient"
            >
              <div>
                <label
                  htmlFor="walk-in-name"
                  className="block text-label-md font-medium text-on-surface"
                >
                  Patient name
                </label>
                <input
                  id="walk-in-name"
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label
                  htmlFor="walk-in-phone"
                  className="block text-label-md font-medium text-on-surface"
                >
                  Phone <span className="text-on-surface-variant/70">(optional)</span>
                </label>
                <input
                  id="walk-in-phone"
                  type="tel"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="+92 300 0000000"
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending !== null}>
                {pending === "walkIn" ? "Adding..." : "Add to Queue"}
              </Button>
            </form>
          )}
        </div>

        {feedback && <FeedbackMessage feedback={feedback} />}
      </div>
    </section>
  );
}