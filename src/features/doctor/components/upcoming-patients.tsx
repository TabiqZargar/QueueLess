import { StaffWaitListEntry } from "@/lib/queue/queue-service";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import type { DoctorQueueState } from "../get-doctor-data";

interface UpcomingPatientsProps {
  upcoming: StaffWaitListEntry[];
  queueStatus: DoctorQueueState;
}

/**
 * Concise list of who is next. No per-entry actions and no unnecessary
 * patient information - the doctor only needs token, position and ETA.
 */
export function UpcomingPatients({
  upcoming,
  queueStatus,
}: UpcomingPatientsProps) {
  const listActive = queueStatus === "ACTIVE" || queueStatus === "PAUSED";

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
      aria-labelledby="doctor-upcoming-heading"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2
          id="doctor-upcoming-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Up Next
        </h2>
      </div>

      {!listActive ? (
        <div className="px-6 py-8 text-center text-sm text-gray-500">
          <p>The queue is no longer active.</p>
        </div>
      ) : upcoming.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-500">No patients are currently waiting.</p>
          <p className="mt-1 text-xs text-gray-400">
            The next patient will appear here once staff call them.
          </p>
        </div>
      ) : (
        <ol className="list-none divide-y divide-gray-100">
          {upcoming.map((entry, index) => (
            <li
              key={entry.entryId}
              className="flex items-center justify-between gap-4 px-6 py-3"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-center text-sm text-gray-400">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatQueueToken(entry.tokenNumber)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Position {entry.position}</span>
                <span className="text-gray-500">
                  {formatWaitTime(entry.estimatedWaitMinutes)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}