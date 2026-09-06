import { describe, expect, it, vi } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { QueuePausedError } from "@/lib/queue/errors";
import type { QueueEventPublisher } from "@/lib/realtime/publisher";
import {
  createQueuePublisher,
  SafeQueuePublisher,
} from "@/lib/realtime/publisher";
import { createRealtimeEvent } from "@/lib/realtime/events";
import type { QueueRealtimeEventInput } from "@/lib/realtime/events";
import type { RealtimeTransport } from "@/lib/realtime/transport";
import { InMemoryRealtimeTransport } from "@/lib/realtime/in-memory-transport";

type Published = { queueId: string; event: QueueRealtimeEventInput };

class RecordingPublisher implements QueueEventPublisher {
  readonly published: Published[] = [];

  async publish(queueId: string, event: QueueRealtimeEventInput): Promise<void> {
    this.published.push({ queueId, event });
  }
}

function createService(publisher?: QueueEventPublisher): QueueService {
  return new QueueService(new MockQueueRepository(), publisher);
}

describe("QueueService realtime publishing", () => {
  it("publishes QUEUE_UPDATED after joinQueue", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    await service.joinQueue({ queueId: "queue-1", patientId: "patient-1" });

    expect(recorder.published).toHaveLength(1);
    expect(recorder.published[0].queueId).toBe("queue-1");
    expect(recorder.published[0].event.type).toBe("QUEUE_UPDATED");
  });

  it("publishes a single QUEUE_UPDATED for addWalkIn", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    await service.addWalkIn({ queueId: "queue-1", patientId: "patient-2" });

    expect(recorder.published).toHaveLength(1);
    expect(recorder.published[0].event.type).toBe("QUEUE_UPDATED");
  });

  it("publishes nothing when joining a paused queue fails", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    await service.pauseQueue("queue-1");
    await expect(
      service.joinQueue({ queueId: "queue-1", patientId: "patient-1" })
    ).rejects.toBeInstanceOf(QueuePausedError);

    expect(recorder.published).toHaveLength(1); // only the pause event
    expect(recorder.published[0].event.type).toBe("QUEUE_STATUS_CHANGED");
  });

  it("publishes QUEUE_STATUS_CHANGED on pause and resume", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    await service.pauseQueue("queue-1");
    await service.resumeQueue("queue-1");

    expect(recorder.published.map((p) => p.event.type)).toEqual([
      "QUEUE_STATUS_CHANGED",
      "QUEUE_STATUS_CHANGED",
    ]);
    expect(recorder.published.every((p) => p.queueId === "queue-1")).toBe(true);
  });

  it("publishes QUEUE_UPDATED after callNextPatient", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    // Free queue-1 of its active consultation (entry-4) first.
    await service.completeConsultation("entry-4");
    await service.callNextPatient("queue-1");

    const types = recorder.published.map((p) => p.event.type);
    expect(types).toContain("QUEUE_UPDATED");
  });

  it("publishes QUEUE_ENTRY_UPDATED with the entry id for entry transitions", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    // Free queue-1 of its active consultation, then call entry-5 (WAITING -> CALLED).
    await service.completeConsultation("entry-4");
    await service.callNextPatient("queue-1");

    await service.startConsultation("entry-5");
    const started = recorder.published[recorder.published.length - 1];
    expect(started.event.type).toBe("QUEUE_ENTRY_UPDATED");
    expect(started.event).toMatchObject({ entryId: "entry-5" });

    await service.completeConsultation("entry-5");
    const completed = recorder.published[recorder.published.length - 1];
    expect(completed.event.type).toBe("QUEUE_ENTRY_UPDATED");
    expect(completed.event).toMatchObject({ entryId: "entry-5" });
  });

  it("publishes QUEUE_ENTRY_UPDATED for markNoShow", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    await service.markNoShow("entry-5");

    expect(recorder.published).toHaveLength(1);
    expect(recorder.published[0].event.type).toBe("QUEUE_ENTRY_UPDATED");
    expect(recorder.published[0].event).toMatchObject({ entryId: "entry-5" });
  });

  it("publishes QUEUE_UPDATED after cancelQueueEntry", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    await service.cancelQueueEntry("entry-5");

    expect(recorder.published).toHaveLength(1);
    expect(recorder.published[0].event.type).toBe("QUEUE_UPDATED");
    expect(recorder.published[0].event.queueId).toBe("queue-1");
  });

  it("publishes nothing when a mutation fails", async () => {
    const recorder = new RecordingPublisher();
    const service = createService(recorder);

    // startConsultation on a NO_SHOW entry is invalid -> no event.
    await service.markNoShow("entry-5");
    await expect(service.startConsultation("entry-5")).rejects.toThrow();

    // recorder has 1 event (markNoShow); the failed transition added nothing
    expect(recorder.published).toHaveLength(1);
  });

  it("works without a publisher (optional injection)", async () => {
    const service = createService();
    const result = await service.joinQueue({
      queueId: "queue-1",
      patientId: "patient-1",
    });
    expect(result.entry.status).toBe("WAITING");
  });

  it("does not fail the mutation when the publisher throws", async () => {
    const throwingPublisher: QueueEventPublisher = {
      async publish() {
        throw new Error("realtime down");
      },
    };
    // The application always wires QueueService through SafeQueuePublisher, so
    // this exercises the resilience boundary as it exists at runtime.
    const service = createService(new SafeQueuePublisher(throwingPublisher));

    await expect(
      service.joinQueue({ queueId: "queue-1", patientId: "patient-1" })
    ).resolves.toBeDefined();
  });
});

describe("SafeQueuePublisher", () => {
  it("swallows publish errors and latches on first failure", async () => {
    const inner = vi.fn();
    const spyPublisher: QueueEventPublisher = {
      publish: inner,
    };
    inner.mockRejectedValueOnce(new Error("boom"));

    const safe = new SafeQueuePublisher(spyPublisher);
    const event = createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: "queue-1" });

    await expect(safe.publish("queue-1", event)).resolves.toBeUndefined();
    expect(safe.isHealthy()).toBe(false);

    // Subsequent publishes become no-ops.
    await safe.publish("queue-1", event);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("stays healthy while publishes succeed", async () => {
    const safe = new SafeQueuePublisher({
      publish: async () => undefined,
    });

    await safe.publish("queue-1", createRealtimeEvent({ type: "QUEUE_UPDATED", queueId: "queue-1" }));
    expect(safe.isHealthy()).toBe(true);
  });
});

describe("createQueuePublisher + transport integration", () => {
  it("routes queue events to the queue topic of a transport", async () => {
    const transport: RealtimeTransport = new InMemoryRealtimeTransport();
    const publisher = createQueuePublisher(transport);

    const event = createRealtimeEvent({ type: "QUEUE_STATUS_CHANGED", queueId: "queue-1" });
    await publisher.publish("queue-1", event);

    const events = await transport.readEvents("queue:queue-1", 0);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("QUEUE_STATUS_CHANGED");
    expect(await transport.readEvents("queue:queue-2", 0)).toHaveLength(0);
  });
});