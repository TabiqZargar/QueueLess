import Link from "next/link";
import { queueService } from "@/lib/queue/instance";
import { getCurrentUser } from "@/lib/auth/authorization";
import { JoinQueueForm } from "./join-queue-form";

export const dynamic = "force-dynamic";

export default async function JoinQueuePage() {
  const queues = await queueService.listQueues();
  const joinableQueues = queues.filter((q) => q.status === "ACTIVE");
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">Join a Queue</h1>
      <p className="mt-2 text-gray-600">
        Select a queue and enter your details to join.
      </p>

      {!user && (
        <div className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm">
          <p className="font-medium text-warning-800">
            Sign in to join a queue
          </p>
          <p className="mt-1 text-warning-700">
            You&apos;ll need a patient account to receive a token.
          </p>
          <Link
            href="/login?next=/join"
            className="mt-3 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-ring"
          >
            Sign in as Patient
          </Link>
        </div>
      )}

      {joinableQueues.length === 0 ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            No queues available
          </h2>
          <p className="mt-2 text-gray-500">
            No active queues are currently accepting new patients.
          </p>
        </div>
      ) : (
        <JoinQueueForm queues={joinableQueues} />
      )}
    </div>
  );
}