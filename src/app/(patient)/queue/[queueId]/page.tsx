import Link from "next/link";
import { queueService } from "@/lib/queue/instance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import { QueueRealtimeSync } from "@/components/realtime/queue-realtime-sync";

export const dynamic = "force-dynamic";

export default async function QueueOverviewPage({
  params,
}: {
  params: { queueId: string };
}) {
  const queue = await queueService.getQueue(params.queueId);

  if (!queue) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-headline-lg text-on-surface">Queue unavailable</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          This queue could not be found. It may have ended or the link is
          incorrect.
        </p>
        <div className="mt-6">
          <Link
            href="/join"
            className="rounded text-primary-600 underline focus-ring"
          >
            Browse available queues
          </Link>
        </div>
      </div>
    );
  }

  const stats = await queueService.getQueueStats(params.queueId);
  const status = queue.status;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between">
        <p className="text-label-eyebrow text-on-surface-variant">
          Queue overview
        </p>
        <QueueRealtimeSync queueId={queue.id} />
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="bg-primary-700 p-6 text-center">
          <p className="text-label-eyebrow text-primary-200">Now serving</p>
          <p className="text-display-ticket-mobile text-white sm:text-display-ticket">
            {stats.currentToken ? formatQueueToken(stats.currentToken) : "—"}
          </p>
          <div className="mt-3 text-body-md text-primary-100">
            <p className="font-semibold text-white">
              {queue.departmentName ?? "Queue"}
            </p>
            <p>{queue.doctor?.displayName}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3">
            <QueueStatusBadge status={status} />
            {stats.totalWaiting} waiting
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-container p-4">
              <p className="text-label-sm text-on-surface-variant">
                Waiting patients
              </p>
              <p className="mt-1 text-headline-md text-on-surface">
                {stats.totalWaiting}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container p-4">
              <p className="text-label-sm text-on-surface-variant">
                Estimated wait
              </p>
              <p className="mt-1 text-headline-md text-on-surface">
                {formatWaitTime(stats.estimatedWaitMinutes)}
              </p>
            </div>
          </div>

          {status !== "ACTIVE" ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-surface-container p-4">
              <Icon name={status === "PAUSED" ? "pause_circle" : "info"} />
              <p className="text-body-sm text-on-surface">
                {status === "PAUSED"
                  ? "This queue is temporarily paused. Your position is preserved if you already have a token."
                  : "This queue is not accepting new patients right now."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <Link href="/join">
                <Button size="lg" className="w-full">
                  Join This Queue
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <Badge variant="success">Open</Badge>;
  }
  if (status === "PAUSED") {
    return <Badge variant="warning">Paused</Badge>;
  }
  return <Badge variant="default">Closed</Badge>;
}