import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { USER_ROLES } from "@/lib/auth/roles";
import { queueService } from "@/lib/queue/instance";
import {
  getCurrentPatientRegistration,
  patientStatusPath,
} from "@/features/patients/active-registration";
import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { formatQueueToken, formatWaitTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user?.role === USER_ROLES.PATIENT) {
    const active = await getCurrentPatientRegistration(user.id);
    const destination = patientStatusPath(active);
    if (destination) redirect(destination);
  }

  const queues = await queueService.listQueues();

  const activeQueues = queues.filter((q) => q.status === "ACTIVE");
  const pausedQueues = queues.filter((q) => q.status === "PAUSED");

  const stats = new Map<string, { currentToken: number | null; totalWaiting: number; estimatedWaitMinutes: number }>();
  for (const queue of queues) {
    try {
      const s = await queueService.getQueueStats(queue.id);
      stats.set(queue.id, {
        currentToken: s.currentToken,
        totalWaiting: s.totalWaiting,
        estimatedWaitMinutes: s.estimatedWaitMinutes,
      });
    } catch {
      // queues without resolvable stats are skipped
    }
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <LandingHeader user={user} />

      <main>
        <Hero queues={activeQueues} pausedQueues={pausedQueues} stats={stats} />
        <HowItWorks />
        <ClinicalGateways />
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-lowest">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <BrandLogo />
          <p className="text-label-sm text-on-surface-variant">
            Healthcare queue management platform
          </p>
        </div>
      </footer>
    </div>
  );
}

function LandingHeader({ user }: { user: { name: string; role: string } | null }) {
  return (
    <header className="border-b border-outline-variant bg-surface-container-lowest">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <BrandLogo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Landing navigation">
            <a
              href="#how-it-works"
              className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              How it works
            </a>
            <a
              href="#live-queues"
              className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Live queues
            </a>
            <a
              href="#clinical-gateways"
              className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              For clinics
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={homeForRole(user.role)}
                className="rounded-xl bg-primary-container px-3 py-2 text-sm font-medium text-on-primary-container hover:bg-primary-100 transition-colors focus-ring"
              >
                Open {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? "dashboard"}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors focus-ring"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function homeForRole(role: string): string {
  switch (role) {
    case "STAFF":
      return "/staff/dashboard";
    case "DOCTOR":
      return "/doctor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/join";
  }
}

function Hero({
  queues,
  pausedQueues,
  stats,
}: {
  queues: Awaited<ReturnType<typeof queueService.listQueues>>;
  pausedQueues: Exclude<typeof queues, undefined>;
  stats: Map<string, { currentToken: number | null; totalWaiting: number; estimatedWaitMinutes: number }>;
}) {
  return (
    <section className="bg-surface-container-low">
      <div className="container grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="text-label-eyebrow text-primary-600">QueueLess</p>
          <h1 className="mt-3 text-headline-xl text-on-surface sm:text-5xl">
            No more standing in line.
          </h1>
          <p className="mt-4 max-w-xl text-body-lg text-on-surface-variant">
            Join a clinic queue from your phone, track your place in line live,
            and be the moment it&apos;s your turn — without crowding the lobby.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/join"
              className="rounded-xl bg-primary-600 px-6 py-3 text-center text-base font-medium text-white hover:bg-primary-700 transition-colors focus-ring"
            >
              Join a Queue
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-outline bg-white px-6 py-3 text-center text-base font-medium text-on-surface hover:bg-surface-container transition-colors focus-ring"
            >
              Check My Status
            </Link>
          </div>
        </div>

        <div id="live-queues" className="space-y-4">
          {queues.length === 0 && pausedQueues.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
              <Icon name="queue" size="xl" className="mx-auto text-outline" />
              <p className="mt-3 font-medium text-on-surface">
                No live queues right now
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Check back shortly or contact your clinic.
              </p>
            </div>
          ) : (
            [...queues, ...pausedQueues].map((queue) => {
              const s = stats.get(queue.id);
              const isPaused = queue.status === "PAUSED";
              return (
                <div
                  key={queue.id}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {isPaused ? (
                          <Badge variant="warning">Paused</Badge>
                        ) : (
                          <Badge variant="success">Live</Badge>
                        )}
                        <h2 className="text-headline-md text-on-surface">
                          {queue.departmentName ?? "Queue"}
                        </h2>
                      </div>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        {queue.doctor?.displayName}
                      </p>
                      <p className="text-label-sm text-on-surface-variant/60">
                        {queue.clinicName}
                      </p>
                    </div>
                    {s && (
                      <div className="text-right">
                        <p className="text-label-sm text-on-surface-variant">
                          Now serving
                        </p>
                        <p className="text-headline-md font-bold text-primary-700">
                          {s.currentToken ? formatQueueToken(s.currentToken) : "—"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-label-sm text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="group" size="sm" />
                      {s?.totalWaiting ?? 0} waiting
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="schedule" size="sm" />
                      {s ? formatWaitTime(s.estimatedWaitMinutes) : "—"}
                    </span>
                    {!isPaused && (
                      <Link
                        href={`/queue/${queue.id}`}
                        className="ml-auto font-medium text-primary-600 hover:underline"
                      >
                        View queue
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: "how_to_reg",
      title: "Join online",
      body: "Pick your clinic&apos;s queue from your phone and get your token instantly.",
    },
    {
      icon: "monitor_heart",
      title: "Track live",
      body: "Watch your position and estimated wait update in real time as the queue moves.",
    },
    {
      icon: "doorbell",
      title: "Get called",
      body: "Head to the consultation room when your token comes up — no crowded lobby.",
    },
  ];

  return (
    <section id="how-it-works" className="border-y border-outline-variant bg-surface-container-lowest">
      <div className="container py-16">
        <div className="text-center">
          <p className="text-label-eyebrow text-primary-600">How it works</p>
          <h2 className="mt-2 text-headline-lg text-on-surface">
            A calmer visit, from check-in to appointment
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-outline-variant bg-surface-container-lowest p-6"
            >
              <span className="absolute right-5 top-5 text-headline-lg font-bold text-primary-100">
                0{index + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                <Icon name={step.icon} size="md" />
              </div>
              <h3 className="mt-4 text-headline-sm text-on-surface">
                {step.title}
              </h3>
              <p
                className="mt-2 text-body-md text-on-surface-variant"
                dangerouslySetInnerHTML={{ __html: step.body }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClinicalGateways() {
  const gateways = [
    {
      title: "Staff operations",
      icon: "support_agent",
      body: "Run each queue from one console: call the next patient, register walk-ins, mark no-shows, pause and resume, and watch activity as it happens.",
      href: "/staff/dashboard",
      cta: "Open staff console",
    },
    {
      title: "Doctor console",
      icon: "stethoscope",
      body: "See who you&apos;re serving and who&apos;s next. Start and complete consultations as patients arrive.",
      href: "/doctor/dashboard",
      cta: "Open doctor console",
    },
    {
      title: "Admin dashboard",
      icon: "admin_panel_settings",
      body: "Oversee the platform&apos;s registered roles and system health from a single view.",
      href: "/admin/dashboard",
      cta: "Open admin dashboard",
    },
  ];

  return (
    <section id="clinical-gateways" className="bg-surface-container-low">
      <div className="container py-16">
        <div className="text-center">
          <p className="text-label-eyebrow text-primary-600">
            For clinics & operations teams
          </p>
          <h2 className="mt-2 text-headline-lg text-on-surface">
            One platform, three consoles
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {gateways.map((gateway) => (
            <div
              key={gateway.title}
              className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <Icon name={gateway.icon} size="md" />
              </div>
              <h3 className="mt-4 text-headline-sm text-on-surface">
                {gateway.title}
              </h3>
              <p className="mt-2 flex-1 text-body-md text-on-surface-variant">
                {gateway.body}
              </p>
              <Link
                href={gateway.href}
                className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
              >
                {gateway.cta}
                <Icon name="arrow_forward" size="sm" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}