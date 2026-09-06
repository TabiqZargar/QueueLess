import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRealtimePoller } from "@/lib/realtime/polling-client";
import type { RealtimePollResult } from "@/lib/realtime/polling-client";

const INTERVAL = 3000;

function result(events: number[], latestSequence: number): RealtimePollResult {
  return {
    events: events.map((sequence, index) => ({
      id: `evt-${index}`,
      type: "QUEUE_UPDATED",
      occurredAt: "2024-01-20T10:30:00.000Z",
      queueId: "queue-1",
      sequence,
    })),
    latestSequence,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRealtimePoller", () => {
  it("polls immediately on start with the initial cursor", async () => {
    const fetchEvents = vi.fn(async (after: number) => result([1], 1));
    const onEvents = vi.fn();
    const poller = createRealtimePoller({
      queueId: "queue-1",
      initialAfter: 7,
      fetchEvents,
      onEvents,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchEvents).toHaveBeenCalledTimes(1);
    expect(fetchEvents).toHaveBeenCalledWith(7);
    expect(onEvents).toHaveBeenCalledTimes(1);
  });

  it("reports live after a successful poll and advances the cursor", async () => {
    const fetchEvents = vi.fn(async (after: number) => result([1, 2], 2));
    const onStatus = vi.fn();
    const poller = createRealtimePoller({
      queueId: "queue-1",
      fetchEvents,
      onStatus,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(poller.status).toBe("live");
    expect(onStatus).toHaveBeenCalledWith("live");

    // Next poll uses the advanced cursor from the server.
    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenLastCalledWith(2);
  });

  it("keeps polling at the configured interval", async () => {
    const fetchEvents = vi.fn(async () => result([], 0));
    const poller = createRealtimePoller({
      queueId: "queue-1",
      intervalMs: INTERVAL,
      fetchEvents,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenCalledTimes(3);
  });

  it("does not emit events when nothing new arrived", async () => {
    const fetchEvents = vi.fn(async () => result([], 0));
    const onEvents = vi.fn();
    const poller = createRealtimePoller({
      queueId: "queue-1",
      fetchEvents,
      onEvents,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(0);

    expect(onEvents).not.toHaveBeenCalled();
  });

  it("goes unavailable on a failed poll and recovers on the next tick", async () => {
    const fetchEvents = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(result([5], 5));
    const onStatus = vi.fn();
    const onEvents = vi.fn();
    const poller = createRealtimePoller({
      queueId: "queue-1",
      fetchEvents,
      onStatus,
      onEvents,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(poller.status).toBe("unavailable");
    expect(onEvents).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(0);
    expect(poller.status).toBe("live");
    expect(onEvents).toHaveBeenCalledTimes(1);
    expect(fetchEvents).toHaveBeenLastCalledWith(0);
  });

  it("stops polling and clears the timer on stop()", async () => {
    const fetchEvents = vi.fn(async () => result([], 0));
    const poller = createRealtimePoller({
      queueId: "queue-1",
      intervalMs: INTERVAL,
      fetchEvents,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenCalledTimes(1);

    poller.stop();
    await vi.advanceTimersByTimeAsync(INTERVAL * 10);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });

  it("ignores an in-flight result delivered after stop()", async () => {
    let resolveFetch: (value: RealtimePollResult) => void = () => undefined;
    const fetchEvents = vi.fn(
      () =>
        new Promise<RealtimePollResult>((resolve) => {
          resolveFetch = resolve;
        })
    );
    const onEvents = vi.fn();
    const poller = createRealtimePoller({
      queueId: "queue-1",
      fetchEvents,
      onEvents,
    });

    poller.start();
    poller.stop();
    resolveFetch(result([1], 1));
    await vi.advanceTimersByTimeAsync(0);

    expect(onEvents).not.toHaveBeenCalled();
  });

  it("can restart with a fresh poll cycle", async () => {
    const fetchEvents = vi.fn(async () => result([], 0));
    const poller = createRealtimePoller({
      queueId: "queue-1",
      intervalMs: INTERVAL,
      fetchEvents,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.stop();

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    const pollsAfterRestart = fetchEvents.mock.results.length;

    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEvents).toHaveBeenCalledTimes(pollsAfterRestart + 1);
  });
});