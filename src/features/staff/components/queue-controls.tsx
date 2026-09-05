"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QueueStatus } from "@/types";
import { addWalkInAction, type ActionResult } from "../actions";
import { FeedbackMessage, type Feedback } from "@/components/feedback-message";

interface QueueControlsCardProps {
  queueId: string;
  queueStatus: QueueStatus;
}

export function QueueControlsCard({
  queueId,
  queueStatus,
}: QueueControlsCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"walkIn" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

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
    if (result.error) {
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

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
      aria-labelledby="queue-controls-heading"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2
          id="queue-controls-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Queue Controls
        </h2>
      </div>

      <div className="space-y-4 px-6 py-4">
        <div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={!isActive || pending !== null}
            onClick={() => {
              setShowWalkIn((v) => !v);
              setFeedback(null);
            }}
          >
            {showWalkIn ? "Close Walk-in Form" : "Add Walk-in"}
          </Button>

          {showWalkIn && (
            <form
              onSubmit={handleWalkIn}
              className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
              aria-label="Add walk-in patient"
            >
              <div>
                <label
                  htmlFor="walk-in-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Patient name
                </label>
                <input
                  id="walk-in-name"
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label
                  htmlFor="walk-in-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="walk-in-phone"
                  type="tel"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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