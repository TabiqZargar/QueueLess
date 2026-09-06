import type { QueueRealtimeEvent } from "./events";

export type RealtimeConnectionState = "connecting" | "live" | "unavailable";

export interface RealtimePollResult {
  events: QueueRealtimeEvent[];
  latestSequence: number;
}

export interface RealtimePollerDeps {
  queueId: string;
  fetchEvents(after: number): Promise<RealtimePollResult>;
  onEvents?(events: QueueRealtimeEvent[]): void;
  onStatus?(status: RealtimeConnectionState): void;
  intervalMs?: number;
  initialAfter?: number;
}

export interface RealtimePoller {
  readonly status: RealtimeConnectionState;
  start(): void;
  stop(): void;
}

export const DEFAULT_REALTIME_POLL_INTERVAL_MS = 3000;

/**
 * Short-polling loop abstracted from React so it can be tested standalone with
 * fake timers.
 *
 * Polls immediately on start, then every `intervalMs`. The server filters by
 * the `after` cursor, so returned events are always new; the cursor advances to
 * the server's `latestSequence` (defensively clamped to the max event
 * sequence). A failed poll flips status to "unavailable" without aborting:
 * the next tick retries. `stop()` tears the timer down and ignores in-flight
 * results.
 */
export function createRealtimePoller(
  deps: RealtimePollerDeps
): RealtimePoller {
  const intervalMs = deps.intervalMs ?? DEFAULT_REALTIME_POLL_INTERVAL_MS;
  let after = deps.initialAfter ?? 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = true;
  let inFlight = false;
  let status: RealtimeConnectionState = "connecting";

  function emitStatus(next: RealtimeConnectionState): void {
    if (next === status) return;
    status = next;
    deps.onStatus?.(next);
  }

  async function poll(): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await deps.fetchEvents(after);
      if (stopped) return;
      emitStatus("live");
      if (result.events.length > 0) {
        const maxSequence = result.events.reduce(
          (max, e) => Math.max(max, e.sequence),
          result.latestSequence
        );
        after = Math.max(after, maxSequence);
        deps.onEvents?.(result.events);
      }
    } catch {
      if (!stopped) emitStatus("unavailable");
    } finally {
      inFlight = false;
    }
  }

  function schedule(): void {
    if (stopped) return;
    timer = setTimeout(() => {
      if (stopped) return;
      void poll().then(() => {
        if (!stopped) schedule();
      });
    }, intervalMs);
  }

  return {
    get status() {
      return status;
    },

    start() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      stopped = false;
      emitStatus("connecting");
      void poll();
      schedule();
    },

    stop() {
      stopped = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}