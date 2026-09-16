import { formatQueueToken, formatWaitTime } from "@/lib/utils";
import type {
  DoctorQueueState,
  DoctorUpcomingEntry,
} from "../get-doctor-data";

interface UpcomingPatientsProps {
  upcoming: DoctorUpcomingEntry[];
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
      className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
      aria-labelledby="doctor-upcoming-heading"
    >
      <div className="border-b border-outline-variant px-6 py-4">
        <h2
          id="doctor-upcoming-heading"
          className="text-headline-sm text-on-surface"
        >
          Up Next
        </h2>
      </div>

      {!listActive ? (
        <div className="px-6 py-8 text-center text-body-sm text-on-surface-variant">
          <p>The queue is no longer active.</p>
        </div>
      ) : upcoming.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-body-sm text-on-surface-variant">
            No patients are currently waiting.
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant/70">
            The next patient will appear here once staff call them.
          </p>
        </div>
      ) : (
        <ol className="list-none divide-y divide-outline-variant">
          {upcoming.map((entry, index) => (
            <li
              key={entry.entryId}
              className="flex items-center justify-between gap-4 px-6 py-3"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-center text-label-sm text-on-surface-variant/70">
                  {index + 1}
                </span>
                <span className="text-body-md font-semibold text-on-surface">
                  {formatQueueToken(entry.tokenNumber)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-body-sm text-on-surface-variant">
                <span>Position {entry.position}</span>
                <span>{formatWaitTime(entry.estimatedWaitMinutes)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}