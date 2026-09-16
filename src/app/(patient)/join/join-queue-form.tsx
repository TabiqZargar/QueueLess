"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  joinQueueAction,
  JoinQueueActionState,
} from "@/features/patients/queue-actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import {
  displayDepartmentName,
  displayDoctorName,
  JoinableQueueCard,
} from "./join-queue-model";

interface JoinQueueFormProps {
  queues: JoinableQueueCard[];
}

export function JoinQueueForm({ queues }: JoinQueueFormProps) {
  const [selectedQueueId, setSelectedQueueId] = useState<string>(
    queues[0]?.id ?? ""
  );
  const [state, setState] = useState<JoinQueueActionState>({});
  const [isPending, setIsPending] = useState(false);

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
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
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-headline-md text-on-surface">Patient intake</h2>
      <p className="mt-1 text-body-md text-on-surface-variant">
        Select a queue and confirm your details to receive a token.
      </p>

      <div className="mt-6">
        <label
          htmlFor="queueId"
          className="block text-label-md font-medium text-on-surface"
        >
          Queue
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {queues.map((q) => (
            <QueueCard
              key={q.id}
              queue={q}
              selected={q.id === selectedQueueId}
              onSelect={() => setSelectedQueueId(q.id)}
            />
          ))}
        </div>
        <input type="hidden" name="queueId" value={selectedQueueId} />
        {fieldErrors?.queueId && (
          <p className="mt-1 text-sm text-danger-600" role="alert">
            {fieldErrors.queueId[0]}
          </p>
        )}
      </div>

      <div className="mt-7">
        <label
          htmlFor="name"
          className="block text-label-md font-medium text-on-surface"
        >
          Patient name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          className="mt-1.5 block w-full rounded-xl border border-outline bg-white px-4 py-3 text-base focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {fieldErrors?.name && (
          <p className="mt-1 text-sm text-danger-600" role="alert">
            {fieldErrors.name[0]}
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="phone"
          className="block text-label-md font-medium text-on-surface"
        >
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+92 300 0000000"
          className="mt-1.5 block w-full rounded-xl border border-outline bg-white px-4 py-3 text-base focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
          className="mt-6 rounded-xl border border-danger-200 bg-error-container p-4 text-sm text-on-error-container"
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-8 w-full"
        disabled={isPending || !selectedQueueId}
      >
        {isPending ? "Joining queue..." : "Join Queue"}
      </Button>

      <p className="mt-4 text-center text-body-sm text-on-surface-variant">
        Already in a queue?{" "}
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          Check your status
        </Link>
      </p>
    </form>
  );
}

function QueueCard({
  queue,
  selected,
  onSelect,
}: {
  queue: JoinableQueueCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const stats = queue.stats;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary-600 bg-primary-container ring-2 ring-primary-600"
          : "border-outline bg-white hover:bg-surface-container"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 text-primary-700">
          <Icon name="check_circle" size="sm" filled />
        </span>
      )}
      <p className="font-semibold text-on-surface">
        {displayDepartmentName(queue)}
      </p>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">
        {displayDoctorName(queue)}
      </p>
      <div className="mt-3 flex items-center gap-3 text-label-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <Icon name="group" size="sm" />
          {stats?.totalWaiting ?? 0} ahead
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="schedule" size="sm" />
          {stats ? formatWaitTime(stats.estimatedWaitMinutes) : "—"}
        </span>
      </div>
    </button>
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
  queue?: JoinableQueueCard;
  queueId: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
        <Icon name="verified" size="lg" filled />
      </div>
      <p className="mt-5 text-label-md font-medium text-primary-700">
        You&apos;re in the queue
      </p>
      <h2 className="mt-1 text-headline-md text-on-surface">
        {displayDepartmentName(
          queue ?? {
            id: queueId,
            status: "ACTIVE",
          }
        )}
      </h2>
      <p className="text-body-md text-on-surface-variant">
        {queue ? displayDoctorName(queue) : undefined}
      </p>

      <div className="mx-auto mt-6 max-w-xs">
        <p className="text-label-eyebrow text-on-surface-variant">
          Your token
        </p>
        <p className="text-display-ticket-mobile text-primary-600 sm:text-display-ticket">
          {formatQueueToken(tokenNumber)}
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left">
        <div className="rounded-xl bg-surface-container p-4">
          <p className="text-label-sm text-on-surface-variant">
            Your position
          </p>
          <p className="mt-1 text-headline-md text-on-surface">
            #{Math.max(position, 0)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-container p-4">
          <p className="text-label-sm text-on-surface-variant">
            Estimated wait
          </p>
          <p className="mt-1 text-headline-md text-on-surface">
            {formatWaitTime(estimatedWaitMinutes)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href={`/queue/${queueId || ""}/status`}
          className="block rounded-xl bg-primary-600 px-6 py-3 text-center text-base font-medium text-white hover:bg-primary-700 focus-ring"
        >
          View Queue Status
        </Link>
      </div>
    </div>
  );
}