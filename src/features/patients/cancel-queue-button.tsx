"use client";

import { useState } from "react";
import { cancelQueueEntryAction } from "@/features/patients/queue-actions";
import { Button } from "@/components/ui/button";

export function CancelQueueButton() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [cancelled, setCancelled] = useState(false);

  async function handleCancel() {
    setIsPending(true);
    setError(undefined);
    try {
      const result = await cancelQueueEntryAction();
      if (result.error) {
        setError(result.error);
      } else {
        setCancelled(true);
      }
    } finally {
      setIsPending(false);
    }
  }

  if (cancelled) {
    return (
      <Button
        variant="secondary"
        type="button"
        className="w-full"
        disabled
      >
        Entry cancelled
      </Button>
    );
  }

  if (confirming) {
    return (
      <div
        className="mt-6 rounded-lg border border-danger-200 bg-danger-50 p-4"
        data-testid="cancel-confirm"
      >
        <p className="text-sm font-medium text-danger-800">
          Are you sure you want to cancel?
        </p>
        <p className="mt-1 text-sm text-danger-700">
          You will lose your current position in the queue.
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirming(false)}
          >
            Keep My Place
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? "Cancelling..." : "Cancel Queue Entry"}
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-danger-700" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setConfirming(true)}
      >
        Cancel My Queue Entry
      </Button>
      {error && (
        <p className="mt-3 text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
