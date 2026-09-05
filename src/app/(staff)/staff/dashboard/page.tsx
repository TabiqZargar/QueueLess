import { queueService } from "@/lib/queue/instance";
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

  const selectedQueueId =
    (requestedQueueId &&
      queues.some((q) => q.id === requestedQueueId) &&
      requestedQueueId) ||
    [...queues]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .find((q) => q.status === "ACTIVE")?.id ||
    queues[0]?.id ||
    "";

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