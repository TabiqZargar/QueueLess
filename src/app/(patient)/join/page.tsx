import { queueService } from "@/lib/queue/instance";
import { JoinQueueForm } from "./join-queue-form";

export const dynamic = "force-dynamic";

export default async function JoinQueuePage() {
  const queues = await queueService.listQueues();
  const joinableQueues = queues.filter((q) => q.status === "ACTIVE");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">Join a Queue</h1>
      <p className="mt-2 text-gray-600">
        Select a queue and enter your details to join.
      </p>

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
