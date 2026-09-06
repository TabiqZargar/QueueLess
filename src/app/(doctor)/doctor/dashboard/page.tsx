import { queueService } from "@/lib/queue/instance";
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