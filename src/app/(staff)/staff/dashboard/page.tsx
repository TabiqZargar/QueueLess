import { queueService } from "@/lib/queue/instance";
import { resolveSelectedQueueId } from "@/lib/queue/queue-selection";
import { getStaffDashboardData } from "@/features/staff/get-staff-data";
import { StaffDashboard } from "@/features/staff/components/staff-dashboard";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage({
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
    ? await getStaffDashboardData(selectedQueueId)
    : null;

  return (
    <StaffDashboard
      queues={queues}
      selectedQueueId={selectedQueueId}
      data={data}
    />
  );
}