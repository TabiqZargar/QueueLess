import type { StaffStatusCounts, StaffDashboardData } from "../get-staff-data";
import { Icon } from "@/components/ui/icon";

const STAT_CARDS: {
  key: keyof StaffStatusCounts;
  label: string;
  icon: string;
  valueClass: string;
}[] = [
  {
    key: "waiting",
    label: "Waiting",
    icon: "group",
    valueClass: "text-primary-600",
  },
  {
    key: "called",
    label: "Called",
    icon: "campaign",
    valueClass: "text-warning-600",
  },
  {
    key: "inConsultation",
    label: "Serving",
    icon: "stethoscope",
    valueClass: "text-tertiary-600",
  },
  {
    key: "completed",
    label: "Completed",
    icon: "task_alt",
    valueClass: "text-on-surface",
  },
];

export function QueueStats({ data }: { data: StaffDashboardData }) {
  return (
    <section
      aria-label="Queue statistics"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {STAT_CARDS.map(({ key, label, icon, valueClass }) => (
        <div
          key={key}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon name={icon} size="sm" />
            <p className="text-label-sm">{label}</p>
          </div>
          <p className={`mt-2 text-headline-lg ${valueClass}`}>
            {data.counts[key]}
          </p>
        </div>
      ))}
    </section>
  );
}