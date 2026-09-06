import { queueService } from "@/lib/queue/instance";
import { resolveSelectedQueueId } from "@/lib/queue/queue-selection";
import { getDoctorDashboardData } from "@/features/doctor/get-doctor-data";
import { DoctorDashboard } from "@/features/doctor/components/doctor-dashboard";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: { queue?: string };
}) {
  const queues = await queueService.listQueues();

  const rawQueueId = searchParams.queue;
  const requestedQueueId =
    typeof rawQueueId === "string" && rawQueueId.length > 0
      ? rawQueueId
      : undefined;

  const selectedQueueId = resolveSelectedQueueId(queues, requestedQueueId);

  const data = selectedQueueId
    ? await getDoctorDashboardData(selectedQueueId)
    : null;

  return (
    <DoctorDashboard
      queues={queues}
      selectedQueueId={selectedQueueId}
      data={data}
    />
  );
}