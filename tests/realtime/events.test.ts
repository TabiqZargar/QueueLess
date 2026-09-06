import { describe, expect, it } from "vitest";
import { createRealtimeEvent } from "@/lib/realtime/events";
import {
  isQueueTopic,
  parseQueueTopic,
  queueTopic,
} from "@/lib/realtime/topics";

describe("createRealtimeEvent", () => {
  it("builds a QUEUE_UPDATED event without an entryId", () => {
    const event = createRealtimeEvent(
      { type: "QUEUE_UPDATED", queueId: "queue-1" },
      { id: "evt-1", occurredAt: "2024-01-20T10:30:00.000Z" }
    );

    expect(event).toEqual({
      id: "evt-1",
      type: "QUEUE_UPDATED",
      occurredAt: "2024-01-20T10:30:00.000Z",
      queueId: "queue-1",
    });
    expect("entryId" in event).toBe(false);
  });

  it("builds a QUEUE_ENTRY_UPDATED event with an entryId", () => {
    const event = createRealtimeEvent(
      { type: "QUEUE_ENTRY_UPDATED", queueId: "queue-1", entryId: "entry-5" },
      { id: "evt-2", occurredAt: "2024-01-20T10:31:00.000Z" }
    );

    expect(event).toEqual({
      id: "evt-2",
      type: "QUEUE_ENTRY_UPDATED",
      occurredAt: "2024-01-20T10:31:00.000Z",
      queueId: "queue-1",
      entryId: "entry-5",
    });
  });

  it("builds a QUEUE_STATUS_CHANGED event without an entryId", () => {
    const event = createRealtimeEvent(
      { type: "QUEUE_STATUS_CHANGED", queueId: "queue-1" },
      { id: "evt-3", occurredAt: "2024-01-20T10:32:00.000Z" }
    );

    expect(event.type).toBe("QUEUE_STATUS_CHANGED");
    expect(event.queueId).toBe("queue-1");
    expect("entryId" in event).toBe(false);
  });

  it("rejects QUEUE_ENTRY_UPDATED without an entryId", () => {
    expect(() =>
      createRealtimeEvent({ type: "QUEUE_ENTRY_UPDATED", queueId: "queue-1" })
    ).toThrow(/entryId/);
  });

  it("defaults id and occurredAt when not provided", () => {
    const event = createRealtimeEvent({
      type: "QUEUE_UPDATED",
      queueId: "queue-1",
    });

    expect(event.id.length).toBeGreaterThan(0);
    expect(new Date(event.occurredAt).getTime()).not.toBeNaN();
  });
});

describe("queue topics", () => {
  it("maps a queue id to its topic and back", () => {
    expect(queueTopic("queue-1")).toBe("queue:queue-1");
    expect(parseQueueTopic("queue:queue-1")).toBe("queue-1");
    expect(isQueueTopic("queue:queue-1")).toBe(true);
  });

  it("rejects non-queue topics", () => {
    expect(parseQueueTopic("queue:")).toBeNull();
    expect(parseQueueTopic("clinic:clinic-1")).toBeNull();
    expect(isQueueTopic("clinic:clinic-1")).toBe(false);
  });
});