export default function QueuePage({
  params,
}: {
  params: { queueId: string };
}) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">Queue Status</h1>
      <p className="mt-2 text-gray-600">Queue ID: {params.queueId}</p>
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-500">Queue status will be displayed here.</p>
      </div>
    </div>
  );
}
