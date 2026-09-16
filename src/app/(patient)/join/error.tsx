"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function JoinQueueError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <div className="rounded-2xl bg-primary-700 p-8 text-white">
            <p className="text-label-eyebrow text-primary-200">QueueLess</p>
            <h1 className="mt-2 text-headline-xl text-white">
              Welcome, how can we help you today?
            </h1>
            <p className="mt-3 text-body-lg text-primary-100">
              Join an active queue and we&apos;ll text you the moment it&apos;s
              your turn. Skip standing in line — track your token live from your
              phone.
            </p>
          </div>
        </section>
        <section>
          <div
            role="alert"
            className="rounded-2xl border border-danger-200 bg-error-container p-8 text-center shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-danger-50 text-danger-700">
              <Icon name="error" size="md" filled />
            </div>
            <h2 className="mt-4 text-headline-md text-on-error-container">
              Unable to load queues
            </h2>
            <p className="mt-2 text-body-md text-on-error-container">
              {error.digest
                ? "A server error occurred while loading queue data."
                : "Something went wrong while fetching available queues."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => router.refresh()}
                size="lg"
              >
                Try again
              </Button>
              <Link
                href="/"
                className="rounded-xl border border-outline bg-white px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Go to homepage
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
