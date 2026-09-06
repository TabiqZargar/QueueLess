import { QueueStatusCounts } from "@/lib/queue/queue-service";

interface QueueSummaryProps {
  counts: QueueStatusCounts;
}

/**
 * Small operational summary - deliberately secondary to the current
 * patient workflow. Counts come straight from the service layer.
 */
export function QueueSummary({ counts }: QueueSummaryProps) {
  const items = [
    { label: "Waiting", value: counts.waiting },
    { label: "In consultation", value: counts.inConsultation },
    { label: "Completed", value: counts.completed },
  ];

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
      aria-labelledby="doctor-summary-heading"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2
          id="doctor-summary-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Queue Summary
        </h2>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-gray-100">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-6 text-center">
            <dd className="text-2xl font-bold text-gray-900">{item.value}</dd>
            <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              {item.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}