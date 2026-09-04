import Link from "next/link";
import { queueService } from "@/lib/queue/instance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatWaitTime } from "@/lib/utils";

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
        <h1 className="text-2xl font-bold text-gray-900">Queue unavailable</h1>
        <p className="mt-2 text-gray-600">
          This queue could not be found. It may have ended or the link is
          incorrect.
        </p>
        <div className="mt-6">
          <Link
            href="/join"
            className="text-primary-600 underline focus-ring rounded"
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
      <h1 className="text-2xl font-bold text-gray-900">
        {queue.departmentName ?? "Queue"}
      </h1>
      <p className="mt-1 text-gray-600">{queue.doctor?.displayName}</p>
      <div className="mt-2">
        <QueueStatusBadge status={status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Now serving</p>
          <p className="mt-1 text-2xl font-bold text-primary-600">
            {stats.currentToken ? formatToken(stats.currentToken) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Waiting</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.totalWaiting} patient{stats.totalWaiting === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-gray-500">Estimated wait</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatWaitTime(stats.estimatedWaitMinutes)}
        </p>
      </div>

      {status !== "ACTIVE" ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-sm font-medium text-gray-700">
            {status === "PAUSED"
              ? "This queue is temporarily paused."
              : "This queue is not accepting new patients."}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <Link href="/join">
            <Button size="lg" className="w-full">
              Join This Queue
            </Button>
          </Link>
        </div>
      )}
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

function formatToken(tokenNumber: number): string {
  return `A-${tokenNumber}`;
}
