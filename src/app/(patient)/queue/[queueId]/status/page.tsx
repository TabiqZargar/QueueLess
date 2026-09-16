import Link from "next/link";
import { guardPage } from "@/lib/auth/page-guard";
import { USER_ROLES } from "@/lib/auth/roles";
import { Forbidden } from "@/components/forbidden";
import { queueService } from "@/lib/queue/instance";
import { getPatientStatus } from "@/features/patients/get-patient-status";
import type { PatientStatusData } from "@/features/patients/get-patient-status";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import { CancelQueueButton } from "@/features/patients/cancel-queue-button";
import { QueueRealtimeSync } from "@/components/realtime/queue-realtime-sync";

export const dynamic = "force-dynamic";

export default async function QueueStatusPage({
  params,
}: {
  params: { queueId: string };
}) {
  const guard = await guardPage(
    [USER_ROLES.PATIENT],
    `/queue/${params.queueId}/status`
  );

  if (guard.status === "forbidden") {
    return <Forbidden />;
  }

  const registrations =
    await queueService.getActiveRegistrationsForPatient(guard.user.id);

  const entry = registrations.find((e) => e.queueId === params.queueId);
  if (!entry) {
    return <NoEntry queueId={params.queueId} />;
  }

  const data = await getPatientStatus(entry.id);

  if (data.entryNotFound) {
    return <NoEntry queueId={params.queueId} />;
  }

  if (data.queueNotFound) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-headline-lg text-on-surface">
          Queue unavailable
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
          <Icon name="task_alt" size="lg" filled />
        </div>
        <h2 className="mt-4 text-headline-md text-on-surface">
          Consultation completed
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Your visit is complete. Thank you.
        </p>
        <Link href="/join" className="mt-4 inline-block">
          <Button>Join another queue</Button>
        </Link>
      </EntryState>
    );
  }

  if (data.entryStatus === "CANCELLED") {
    return (
      <EntryState queueId={params.queueId}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-error-container text-on-error-container">
          <Icon name="cancel" size="lg" filled />
        </div>
        <h2 className="mt-4 text-headline-md text-on-surface">
          Queue entry cancelled
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
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
        <h2 className="text-headline-md text-on-surface">
          Entry marked as no-show
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Your turn was not taken. Please see reception for assistance.
        </p>
        <Link href="/join" className="mt-4 inline-block">
          <Button>Join another queue</Button>
        </Link>
      </EntryState>
    );
  }

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
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-label-eyebrow text-on-surface-variant">
          Patient status
        </p>
        <QueueRealtimeSync queueId={queueId} />
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="bg-primary-700 p-6 text-center">
          <p className="text-label-eyebrow text-primary-200">Your token</p>
          <p className="text-display-ticket-mobile text-white sm:text-display-ticket">
            {formatQueueToken(data.tokenNumber)}
          </p>
          <div className="mt-3 text-body-md text-primary-100">
            <p className="font-semibold text-white">{data.departmentName}</p>
            <p>{data.doctorName}</p>
            {data.clinicName && <p className="text-primary-200">{data.clinicName}</p>}
          </div>
        </div>

        <div className="p-6">
          <StepsIndicator entryStatus={data.entryStatus} />

          {queuePaused && <PausedNotice />}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCard
              label="Your position"
              value={`#${Math.max(data.position, data.patientsAhead + 1, 1)}`}
            />
            <StatCard
              label="Estimated wait"
              value={formatWaitTime(data.estimatedWaitMinutes)}
            />
          </div>

          <div className="mt-3 rounded-xl bg-surface-container px-5 py-4 text-center">
            <p className="text-label-sm text-on-surface-variant">Now serving</p>
            <p className="mt-1 text-headline-md text-on-surface">
              {data.currentServingToken
                ? formatQueueToken(data.currentServingToken)
                : "—"}
            </p>
          </div>

          <div className="mt-3 text-center text-body-sm text-on-surface-variant">
            <span className="font-medium text-on-surface">
              {Math.max(data.patientsAhead, 0)} patient
              {Math.max(data.patientsAhead, 0) === 1 ? "" : "s"} ahead of you
            </span>{" "}
            — this page updates live.
          </div>

          {data.entryStatus === "WAITING" && <CancelQueueButton />}
        </div>
      </div>
    </div>
  );
}

function StepsIndicator({ entryStatus }: { entryStatus: string }) {
  const steps = [
    { label: "In line", done: true, active: entryStatus === "WAITING" || entryStatus === "REGISTERED" },
    { label: "It's your turn", done: ["CALLED", "IN_CONSULTATION"].includes(entryStatus), active: entryStatus === "CALLED" },
    { label: "In consultation", done: entryStatus === "IN_CONSULTATION", active: entryStatus === "IN_CONSULTATION" },
  ];

  return (
    <ol className="flex items-center">
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                step.done || step.active
                  ? "bg-primary-600 text-white"
                  : "bg-surface-container text-on-surface-variant"
              }`}
              aria-label={`${step.done ? "Completed: " : ""}${step.label}`}
            >
              {step.done || step.active ? (
                step.done ? (
                  <Icon name="check" size="sm" filled />
                ) : (
                  <Icon name="schedule" size="sm" filled />
                )
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`mt-1.5 hidden text-label-sm sm:block ${
                step.active ? "font-semibold text-primary-700" : "text-on-surface-variant"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <span
              className={`mx-2 mb-4 h-0.5 flex-1 rounded ${
                steps[index + 1].done || steps[index + 1].active
                  ? "bg-primary-600"
                  : "bg-outline-variant"
              }`}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-container p-4 text-center">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 text-headline-md text-on-surface">{value}</p>
    </div>
  );
}

function PausedNotice() {
  return (
    <div
      role="status"
      className="mt-6 rounded-xl border border-warning-200 bg-warning-50 p-4 text-warning-800"
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
        className="mt-4 inline-block rounded text-sm text-primary-600 underline focus-ring"
      >
        View queue
      </Link>
    </div>
  );
}

function NoEntry({ queueId }: { queueId: string }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-headline-lg text-on-surface">No queue entry found</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        We couldn&apos;t find your active queue entry for this queue.
      </p>
      <p className="mt-1 text-body-sm text-on-surface-variant">
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