"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { QueueWithDetails } from "@/lib/queue/repository";
import {
  joinQueueAction,
  JoinQueueActionState,
} from "@/features/patients/queue-actions";
import { Button } from "@/components/ui/button";
import { formatWaitTime } from "@/lib/utils";

interface JoinQueueFormProps {
  queues: QueueWithDetails[];
}

export function JoinQueueForm({ queues }: JoinQueueFormProps) {
  const [selectedQueueId, setSelectedQueueId] = useState<string>(
    queues[0]?.id ?? ""
  );
  const [state, setState] = useState<JoinQueueActionState>({});
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted) return;
    setSubmitted(true);
    setIsPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await joinQueueAction(state, formData);
      setState(result);
    } finally {
      setIsPending(false);
    }
  }

  if (state.result) {
    return (
      <ConfirmationView
        tokenNumber={state.result.tokenNumber}
        position={state.result.position}
        estimatedWaitMinutes={state.result.estimatedWaitMinutes}
        queue={selectedQueue}
        queueId={state.result.queueId}
      />
    );
  }

  const fieldErrors = state.fieldErrors;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label
          htmlFor="queueId"
          className="block text-sm font-medium text-gray-700"
        >
          Queue
        </label>
        <select
          id="queueId"
          name="queueId"
          defaultValue={selectedQueueId}
          onChange={(e) => setSelectedQueueId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.departmentName} — {q.doctor?.displayName}
            </option>
          ))}
        </select>
        {fieldErrors?.queueId && (
          <p className="mt-1 text-sm text-danger-600" role="alert">
            {fieldErrors.queueId[0]}
          </p>
        )}
      </div>

      {selectedQueue && (
        <div className="rounded-lg border border-primary-100 bg-primary-50 p-4">
          <span className="font-medium text-gray-900">
            {selectedQueue.departmentName}
          </span>
          <p className="text-sm text-gray-600">
            {selectedQueue.doctor?.displayName}
          </p>
          <p className="mt-2 text-xs font-medium text-primary-700">
            Join this queue to receive your token.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Patient name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {fieldErrors?.name && (
          <p className="mt-1 text-sm text-danger-600" role="alert">
            {fieldErrors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700"
        >
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+92 300 0000000"
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {fieldErrors?.phone && (
          <p className="mt-1 text-sm text-danger-600" role="alert">
            {fieldErrors.phone[0]}
          </p>
        )}
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || !selectedQueueId}
      >
        {isPending ? "Joining queue..." : "Join Queue"}
      </Button>
    </form>
  );
}

function ConfirmationView({
  tokenNumber,
  position,
  estimatedWaitMinutes,
  queue,
  queueId,
}: {
  tokenNumber: number;
  position: number;
  estimatedWaitMinutes: number;
  queue?: QueueWithDetails;
  queueId: string;
}) {
  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-success-600">
          You&apos;re in the queue
        </p>
        <div className="mt-4">
          <p className="text-sm uppercase tracking-wide text-gray-500">
            Your token
          </p>
          <p className="mt-1 text-6xl font-bold text-primary-600">
            {formatToken(tokenNumber)}
          </p>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900">
            {queue?.departmentName ?? "Queue"}
          </p>
          <p>{queue?.doctor?.displayName}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Your position</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              #{Math.max(position, 0)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Estimated wait</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatWaitTime(estimatedWaitMinutes)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href={`/queue/${queueId || ""}/status`}
          className="block rounded-lg bg-primary-600 px-6 py-3 text-center text-base font-medium text-white hover:bg-primary-700 focus-ring"
        >
          View Queue Status
        </Link>
      </div>
    </div>
  );
}

function formatToken(tokenNumber: number): string {
  return `A-${tokenNumber}`;
}
