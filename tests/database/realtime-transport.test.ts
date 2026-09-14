import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { PostgresRealtimeTransport } from "@/lib/realtime/postgres-transport";
import { createRealtimeEvent } from "@/lib/realtime/events";
import { SafeQueuePublisher } from "@/lib/realtime/publisher";
import { createIsolatedQueue, TestQueueContext } from "./test-context";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("PostgresRealtimeTransport", () => {
  let context: TestQueueContext;

  beforeEach(async () => {
    context = await createIsolatedQueue();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it("publishes events and replays them through a fresh transport instance", async () => {
    const writer = new PostgresRealtimeTransport();
    const event = createRealtimeEvent({
      type: "QUEUE_STATUS_CHANGED",
      queueId: context.queueId,
    });

    const stamped = await writer.publish(`queue:${context.queueId}`, event);

    expect(stamped.id).toBe(event.id);
    expect(stamped.queueId).toBe(context.queueId);
    expect(stamped.type).toBe("QUEUE_STATUS_CHANGED");
    expect(stamped.sequence).toBeGreaterThan(0);

    // A brand-new instance (restart / another serverless container) sees it.
    const reader = new PostgresRealtimeTransport();
    const replayed = await reader.readEvents(`queue:${context.queueId}`, 0);
    expect(replayed).toEqual([stamped]);
  });

  it("returns events strictly after the cursor in ascending order", async () => {
    const transport = new PostgresRealtimeTransport();
    const topic = `queue:${context.queueId}`;

    const first = await transport.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );
    const second = await transport.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_ENTRY_UPDATED", queueId: context.queueId, entryId: "entry-x" })
    );
    const third = await transport.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );

    const afterFirst = await transport.readEvents(topic, first.sequence);
    expect(afterFirst.map((e) => e.sequence)).toEqual([
      second.sequence,
      third.sequence,
    ]);
  });

  it("orders interleaved publishes from multiple instances deterministically", async () => {
    const transportA = new PostgresRealtimeTransport();
    const transportB = new PostgresRealtimeTransport();
    const topic = `queue:${context.queueId}`;

    const first = await transportA.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );
    const second = await transportB.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );
    const third = await transportA.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );

    const events = await transportB.readEvents(topic, 0);
    expect(events.map((e) => e.sequence)).toEqual([
      first.sequence,
      second.sequence,
      third.sequence,
    ]);
  });

  it("isolates event streams between queues", async () => {
    const transport = new PostgresRealtimeTransport();
    await transport.publish(
      `queue:${context.queueId}`,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );

    const empty = await transport.readEvents(`queue:${context.queueId}-other`, 0);
    expect(empty).toEqual([]);
  });

  it("returns no events for an empty queue or an exhausted cursor", async () => {
    const transport = new PostgresRealtimeTransport();
    const topic = `queue:${context.queueId}`;

    expect(await transport.readEvents(topic, 0)).toEqual([]);

    const stamped = await transport.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );
    expect(await transport.readEvents(topic, stamped.sequence)).toEqual([]);
    expect(await transport.readEvents(topic, 100_000)).toEqual([]);
  });

  it("pages long replays with bounded reads", async () => {
    const transport = new PostgresRealtimeTransport({ readLimit: 2 });
    const topic = `queue:${context.queueId}`;

    const sequences: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const stamped = await transport.publish(
        topic,
        createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
      );
      sequences.push(stamped.sequence);
    }

    // Each read returns at most `readLimit` events past the cursor.
    const pageOne = await transport.readEvents(topic, 0);
    expect(pageOne.map((e) => e.sequence)).toEqual(sequences.slice(0, 2));

    const pageTwo = await transport.readEvents(topic, pageOne[1].sequence);
    expect(pageTwo.map((e) => e.sequence)).toEqual(sequences.slice(2, 4));

    const pageThree = await transport.readEvents(topic, pageTwo[1].sequence);
    expect(pageThree.map((e) => e.sequence)).toEqual(sequences.slice(4));
  });

  it("preserves entryId only for QUEUE_ENTRY_UPDATED events", async () => {
    const transport = new PostgresRealtimeTransport();
    const topic = `queue:${context.queueId}`;

    const entryEvent = await transport.publish(
      topic,
      createRealtimeEvent({
        type: "QUEUE_ENTRY_UPDATED",
        queueId: context.queueId,
        entryId: "entry-42",
      })
    );
    expect(entryEvent).toMatchObject({ type: "QUEUE_ENTRY_UPDATED", entryId: "entry-42" });

    await transport.publish(
      topic,
      createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId })
    );

    const replayed = await new PostgresRealtimeTransport().readEvents(topic, 0);
    const [first] = replayed;
    expect(first.type === "QUEUE_ENTRY_UPDATED" ? first.entryId : undefined).toBe(
      "entry-42"
    );
    const entryOnly = replayed.filter((e) => e.type === "QUEUE_ENTRY_UPDATED");
    expect(entryOnly).toHaveLength(1);
  });

  it("rejects non-queue topics for publish and readEvents", async () => {
    const transport = new PostgresRealtimeTransport();
    const event = createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: context.queueId });

    await expect(
      transport.publish(`clinic:${context.clinicId}`, event)
    ).rejects.toThrow(/queue topic/);
    await expect(
      transport.readEvents(`clinic:${context.clinicId}`, 0)
    ).rejects.toThrow(/queue topic/);
  });

  it("SafeQueuePublisher swallows a realtime failure without throwing", async () => {
    const transport = new PostgresRealtimeTransport();
    const safe = new SafeQueuePublisher({
      async publish(queueId, event) {
        // Publish against a queue id that has no row -> FK violation.
        await transport.publish(`queue:${queueId}`, event);
      },
    });

    await expect(
      safe.publish("queue-does-not-exist", createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: "queue-does-not-exist" }))
    ).resolves.toBeUndefined();
    expect(safe.isHealthy()).toBe(false);
  });
});