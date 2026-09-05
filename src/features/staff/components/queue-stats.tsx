import type { StaffStatusCounts, StaffDashboardData } from "../get-staff-data";

const STAT_CARDS: {
  key: keyof StaffStatusCounts;
  label: string;
  className: string;
}[] = [
  { key: "waiting", label: "Waiting", className: "text-primary-600" },
  { key: "called", label: "Called", className: "text-warning-600" },
  {
    key: "inConsultation",
    label: "Serving",
    className: "text-success-600",
  },
  {
    key: "completed",
    label: "Completed",
    className: "text-gray-900",
  },
];

export function QueueStats({ data }: { data: StaffDashboardData }) {
  return (
    <section aria-label="Queue statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_CARDS.map(({ key, label, className }) => (
        <div
          key={key}
          className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className={`mt-1 text-4xl font-bold ${className}`}>
            {data.counts[key]}
          </p>
        </div>
      ))}
    </section>
  );
}