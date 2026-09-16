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
      className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
      aria-labelledby="doctor-summary-heading"
    >
      <div className="border-b border-outline-variant px-6 py-4">
        <h2
          id="doctor-summary-heading"
          className="text-headline-sm text-on-surface"
        >
          Queue Summary
        </h2>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-outline-variant">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col px-4 py-6 text-center">
            <dt className="order-2 mt-1 text-label-sm text-on-surface-variant">
              {item.label}
            </dt>
            <dd className="order-1 text-headline-md font-bold text-on-surface">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}