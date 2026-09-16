import Link from "next/link";
import { redirect } from "next/navigation";
import { queueService } from "@/lib/queue/instance";
import { getCurrentUser } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  getCurrentPatientRegistration,
  patientStatusPath,
} from "@/features/patients/active-registration";
import { JoinQueueForm } from "./join-queue-form";
import {
  buildJoinableQueueCards,
  displayDepartmentName,
  displayDoctorName,
} from "./join-queue-model";

export const dynamic = "force-dynamic";

export default async function JoinQueuePage() {
  const user = await getCurrentUser();

  if (user?.role === USER_ROLES.PATIENT) {
    const active = await getCurrentPatientRegistration(user.id);
    const destination = patientStatusPath(active);
    if (destination) redirect(destination);
  }

  const queues = await queueService.listQueues();
  const joinableQueues = queues.filter((q) => q.status === "ACTIVE");

  const statsByQueue = new Map<
    string,
    { totalWaiting: number; estimatedWaitMinutes: number; currentToken: number | null }
  >();
  for (const queue of joinableQueues) {
    try {
      const stats = await queueService.getQueueStats(queue.id);
      statsByQueue.set(queue.id, {
        totalWaiting: stats.totalWaiting,
        estimatedWaitMinutes: stats.estimatedWaitMinutes,
        currentToken: stats.currentToken,
      });
    } catch {
      // skip queues that fail stats lookup
    }
  }

  const clinicName = joinableQueues[0]?.clinicName;

  const joinableCards = buildJoinableQueueCards(joinableQueues, statsByQueue);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <div className="rounded-2xl bg-primary-700 p-8 text-white">
            <p className="text-label-eyebrow text-primary-200">
              {clinicName ?? "QueueLess"}
            </p>
            <h1 className="mt-2 text-headline-xl text-white">
              Welcome, how can we help you today?
            </h1>
            <p className="mt-3 text-body-lg text-primary-100">
              Join an active queue and we&apos;ll text you the moment it&apos;s
              your turn. Skip standing in line — track your token live from your
              phone.
            </p>

            <div className="mt-8 space-y-3">
              {joinableCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded-xl bg-primary-800/60 px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      {displayDepartmentName(card)}
                    </p>
                    <p className="text-sm text-primary-100">
                      {displayDoctorName(card)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-primary-100">
                    <p>
                      {card.stats?.totalWaiting ?? 0} waiting
                    </p>
                    <p>
                      {card.stats
                        ? formatShortWait(card.stats.estimatedWaitMinutes)
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!user && (
            <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm">
              <p className="font-medium text-warning-800">
                Sign in to join a queue
              </p>
              <p className="mt-1 text-warning-700">
                You&apos;ll need a patient account to receive a token.
              </p>
              <Link
                href="/login?next=/join"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-warning-600 px-4 py-2 text-sm font-medium text-white hover:bg-warning-700 focus-ring"
              >
                Sign in as Patient
              </Link>
            </div>
          )}
        </section>

        <section>
          {joinableQueues.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
              <h2 className="text-headline-md text-on-surface">
                No queues available
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                No active queues are currently accepting new patients. Please
                check back shortly.
              </p>
            </div>
          ) : (
            <JoinQueueForm queues={joinableCards} />
          )}
        </section>
      </div>
    </div>
  );
}

function formatShortWait(minutes: number): string {
  if (minutes < 1) return "~1 min";
  if (minutes < 60) return `~${Math.round(minutes)} min wait`;
  const hours = Math.floor(minutes / 60);
  return `~${hours} hr wait`;
}