import { describe, expect, it, vi } from "vitest";
import { InMemoryRealtimeTransport } from "@/lib/realtime/in-memory-transport";
import { createRealtimeEvent } from "@/lib/realtime/events";

function queueEvent(type: "QUEUE_UPDATED" | "QUEUE_STATUS_CHANGED", queueId = "queue-1") {
  return createRealtimeEvent({ type, queueId });
}

describe("InMemoryRealtimeTransport", () => {
  it("publishes events with monotonically increasing sequences", async () => {
    const transport = new InMemoryRealtimeTransport();

    const first = await transport.publish("queue:queue-1", queueEvent("QUEUE_UPDATED"));
    const second = await transport.publish("queue:queue-1", queueEvent("QUEUE_UPDATED"));

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.sequence).toBeGreaterThan(first.sequence);
    expect(second.queueId).toBe("queue-1");
  });

  it("stores and replays events after a cursor via readEvents", async () => {
    const transport = new InMemoryRealtimeTransport();

    await transport.publish("queue:queue-1", queueEvent("QUEUE_UPDATED"));
    const second = await transport.publish("queue:queue-1", queueEvent("QUEUE_STATUS_CHANGED"));

    const afterZero = await transport.readEvents("queue:queue-1", 0);
    expect(afterZero).toHaveLength(2);

    const afterOne = await transport.readEvents("queue:queue-1", 1);
    expect(afterOne).toHaveLength(1);
    expect(afterOne[0].sequence).toBe(second.sequence);
  });

  it("returns no events for unknown topics or exhausted cursors", async () => {
    const transport = new InMemoryRealtimeTransport();
    await transport.publish("queue:queue-1", queueEvent("QUEUE_UPDATED"));

    expect(await transport.readEvents("queue:unknown", 0)).toEqual([]);
    expect(await transport.readEvents("queue:queue-1", 100)).toEqual([]);
  });

  it("delivers events only to subscribers of the same topic", async () => {
    const transport = new InMemoryRealtimeTransport();
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    transport.subscribe("queue:queue-1", listenerA);
    transport.subscribe("queue:queue-2", listenerB);

    await transport.publish("queue:queue-1", queueEvent("QUEUE_STATUS_CHANGED", "queue-1"));
    await transport.publish("queue:queue-2", queueEvent("QUEUE_STATUS_CHANGED", "queue-2"));

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerA.mock.calls[0][0].queueId).toBe("queue-1");
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(listenerB.mock.calls[0][0].queueId).toBe("queue-2");
  });

  it("delivers to all subscribers and stops delivering after unsubscribe", async () => {
    const transport = new InMemoryRealtimeTransport();
    const first = vi.fn();
    const second = vi.fn();

    transport.subscribe("queue:queue-1", first);
    const subscription = transport.subscribe("queue:queue-1", second);
    subscription.unsubscribe();

    await transport.publish("queue:queue-1", queueEvent("QUEUE_UPDATED"));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("isolates a throwing listener from publishing and other listeners", async () => {
    const transport = new InMemoryRealtimeTransport();
    const healthy = vi.fn();
    const throwing = () => {
      throw new Error("listener boom");
    };

    transport.subscribe("queue:queue-1", throwing);
    transport.subscribe("queue:queue-1", healthy);

    const stamped = await transport.publish("queue:queue-1", queueEvent("QUEUE_UPDATED"));

    expect(stamped.sequence).toBe(1);
    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it("publishes to a topic with no subscribers without error", async () => {
    const transport = new InMemoryRealtimeTransport();
    await expect(
      transport.publish("queue:empty", queueEvent("QUEUE_UPDATED"))
    ).resolves.not.toThrow();
    expect(await transport.readEvents("queue:empty", 0)).toHaveLength(1);
  });
});