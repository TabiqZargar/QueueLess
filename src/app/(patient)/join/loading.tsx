export default function JoinQueueLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <div className="rounded-2xl bg-primary-700 p-8">
            <div className="h-4 w-32 rounded bg-primary-500" />
            <div className="mt-4 h-8 w-72 rounded bg-primary-500" />
            <div className="mt-3 h-4 w-80 rounded bg-primary-500" />
            <div className="mt-8 space-y-3">
              <div className="h-16 rounded-xl bg-primary-800/60" />
              <div className="h-16 rounded-xl bg-primary-800/60" />
            </div>
          </div>
        </section>
        <section>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
            <div className="h-6 w-48 rounded bg-surface-container" />
            <div className="mt-4 h-4 w-64 rounded bg-surface-container" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="h-24 rounded-xl bg-surface-container" />
              <div className="h-24 rounded-xl bg-surface-container" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
