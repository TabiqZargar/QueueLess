import Link from "next/link";
import { getStoredEntryCookie } from "@/features/patients/entry-session";
import {
  getPatientStatus,
  PatientStatusData,
} from "@/features/patients/get-patient-status";
import { Button } from "@/components/ui/button";
import { formatWaitTime } from "@/lib/utils";
import { CancelQueueButton } from "@/features/patients/cancel-queue-button";

export const dynamic = "force-dynamic";

export default async function QueueStatusPage({
  params,
}: {
  params: { queueId: string };
}) {
  const stored = getStoredEntryCookie();

  if (!stored || stored.queueId !== params.queueId) {
    return (
      <NoEntry queueId={params.queueId} />
    );
  }

  const data = await getPatientStatus(stored.entryId);

  if (data.entryNotFound) {
    return (
      <NoEntry queueId={params.queueId} />
    );
  }

  if (data.queueNotFound) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">Queue unavailable</h1>
        <p className="mt-2 text-gray-600">
          This queue could not be found.
        </p>
        <div className="mt-6">
          <Link href="/join">
            <Button>Browse Available Queues</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Terminal / non-tracking states
  if (data.entryStatus === "COMPLETED") {
    return (
      <EntryState queueId={params.queueId}>
        <h2 className="text-lg font-semibold text-gray-900">
          Consultation completed
        </h2>
        <p className="mt-2 text-gray-600">
          Your visit is complete. Thank you.
        </p>
      </EntryState>
    );
  }

  if (data.entryStatus === "CANCELLED") {
    return (
      <EntryState queueId={params.queueId}>
        <h2 className="text-lg font-semibold text-gray-900">
          Queue entry cancelled
        </h2>
        <p className="mt-2 text-gray-600">
          You have left the queue.
        </p>
        <Link href="/join" className="mt-4 inline-block">
          <Button>Join another queue</Button>
        </Link>
      </EntryState>
    );
  }

  if (data.entryStatus === "NO_SHOW") {
    return (
      <EntryState queueId={params.queueId}>
        <h2 className="text-lg font-semibold text-gray-900">
          Entry marked as no-show
        </h2>
        <p className="mt-2 text-gray-600">
          Your turn was not taken. Please see reception for assistance.
        </p>
      </EntryState>
    );
  }

  if (data.entryStatus === "CALLED") {
    return (
      <EntryState queueId={params.queueId}>
        <div role="status" className="text-center">
          <h2 className="text-lg font-semibold text-success-700">
            You&apos;re being called
          </h2>
          <p className="mt-2 text-gray-600">
            Please proceed to the consultation area.
          </p>
        </div>
        <TokenHeader token={data.tokenNumber} />
      </EntryState>
    );
  }

  if (data.entryStatus === "IN_CONSULTATION") {
    return (
      <EntryState queueId={params.queueId}>
        <div role="status" className="text-center">
          <h2 className="text-lg font-semibold text-primary-700">
            Consultation in progress
          </h2>
          <p className="mt-2 text-gray-600">
            Your consultation has started.
          </p>
        </div>
        <TokenHeader token={data.tokenNumber} />
      </EntryState>
    );
  }

  // WAITING (and REGISTERED) — the primary tracking state
  return (
    <StatusView
      queueId={params.queueId}
      data={data}
      queuePaused={data.queueStatus === "PAUSED"}
    />
  );
}

function StatusView({
  queueId,
  data,
  queuePaused,
}: {
  queueId: string;
  data: PatientStatusData;
  queuePaused: boolean;
}) {
  return (
    <div className="mx-auto max-w-md">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-gray-500">
          Your token
        </p>
        <p className="mt-1 text-6xl font-bold text-primary-600">
          {formatToken(data.tokenNumber)}
        </p>
        <div className="mt-2 text-sm text-gray-600">
          <p className="font-medium text-gray-900">{data.departmentName}</p>
          <p>{data.doctorName}</p>
        </div>
      </div>

      {queuePaused && <PausedNotice />}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">Your position</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            #{Math.max(data.position, data.patientsAhead + 1, 1)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">Estimated wait</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {formatWaitTime(data.estimatedWaitMinutes)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
        <p className="text-xs text-gray-500">Now serving</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">
          {data.currentServingToken
            ? formatToken(data.currentServingToken)
            : "—"}
        </p>
      </div>

      <div className="mt-3 text-center text-sm text-gray-500">
        <span className="font-medium text-gray-700">
          {Math.max(data.patientsAhead, 0)} patient
          {Math.max(data.patientsAhead, 0) === 1 ? "" : "s"} ahead of you
        </span>
      </div>

      {data.entryStatus === "WAITING" && (
        <CancelQueueButton />
      )}
    </div>
  );
}

function PausedNotice() {
  return (
    <div
      role="status"
      className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4 text-warning-800"
    >
      <p className="font-medium">Queue temporarily paused</p>
      <p className="mt-1 text-sm">
        Your position is preserved. Waiting time estimates may change when the
        queue resumes.
      </p>
    </div>
  );
}

function EntryState({
  queueId,
  children,
}: {
  queueId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      {children}
      <Link
        href={`/queue/${queueId}`}
        className="mt-4 inline-block text-sm text-primary-600 underline focus-ring rounded"
      >
        View queue
      </Link>
    </div>
  );
}

function TokenHeader({ token }: { token: number }) {
  return (
    <p className="mt-4 text-4xl font-bold text-primary-600">
      {formatToken(token)}
    </p>
  );
}

function NoEntry({ queueId }: { queueId: string }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-bold text-gray-900">No queue entry found</h1>
      <p className="mt-2 text-gray-600">
        We couldn&apos;t find your active queue entry for this queue.
      </p>
      <p className="mt-1 text-gray-500">
        You may have cancelled it, or you haven&apos;t joined yet.
      </p>
      <div className="mt-6 space-y-3">
        <Link href={`/queue/${queueId}`}>
          <Button variant="secondary" className="w-full">
            View Queue Overview
          </Button>
        </Link>
        <Link href="/join">
          <Button className="w-full">Join This Queue</Button>
        </Link>
      </div>
    </div>
  );
}

function formatToken(tokenNumber: number): string {
  return `A-${tokenNumber}`;
}
