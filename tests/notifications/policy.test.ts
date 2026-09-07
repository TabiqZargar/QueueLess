import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { NotificationPolicy } from "@/lib/notifications/policy";
import { NotificationIntent } from "@/lib/notifications/types";
import { QueueEvent } from "@/types";

function buildPolicy(threshold = 2) {
  const service = new QueueService(new MockQueueRepository());
  const policy = new NotificationPolicy(
    { getQueueService: () => service },
    { turnApproachingThreshold: threshold }
  );
  return { policy };
}

function event(partial: Partial<QueueEvent>): QueueEvent {
  return {
    id: "event-test",
    queueId: "queue-1",
    eventType: "QUEUE_JOINED",
    timestamp: new Date("2024-01-20T10:00:00"),
    ...partial,
  };
}

async function typesOf(
  policy: NotificationPolicy,
  ev: QueueEvent
): Promise<NotificationIntent[]> {
  return policy.evaluate(ev);
}

describe("NotificationPolicy — direct event → notification mapping", () => {
  it("maps QUEUE_JOINED to a notification for the joined patient including token and doctor name", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "QUEUE_JOINED", queueEntryId: "entry-5" })
    );

    const joined = intents.find((i) => i.type === "QUEUE_JOINED");
    expect(joined).toBeDefined();
    expect(joined!.userId).toBe("patient-2");
    expect(joined!.entryId).toBe("entry-5");
    expect(joined!.queueId).toBe("queue-1");
    expect(joined!.message).toContain("Dr. Ahmed Khan's queue");
    expect(joined!.message).toContain("A-22");
  });

  it("maps PATIENT_CALLED to the called patient", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "PATIENT_CALLED", queueEntryId: "entry-5" })
    );

    const called = intents.find((i) => i.type === "PATIENT_CALLED");
    expect(called).toBeDefined();
    expect(called!.userId).toBe("patient-2");
    expect(called!.message).toContain("A-22");
  });

  it("maps CONSULTATION_STARTED to the patient being served", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "CONSULTATION_STARTED", queueEntryId: "entry-5" })
    );

    const started = intents.find((i) => i.type === "CONSULTATION_STARTED");
    expect(started).toBeDefined();
    expect(started!.userId).toBe("patient-2");
    expect(started!.message).toContain("A-22");
  });

  it("maps PATIENT_NO_SHOW to the affected patient", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "PATIENT_NO_SHOW", queueEntryId: "entry-6" })
    );

    expect(intents[0].type).toBe("NO_SHOW");
    expect(intents[0].userId).toBe("patient-3");
    expect(intents[0].message).toContain("no-show");
  });

  it("maps QUEUE_PAUSED to every patient with an active entry only", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "QUEUE_PAUSED", queueEntryId: undefined })
    );

    expect(intents).toHaveLength(7); // entry-4..entry-10, all active
    expect(intents.every((i) => i.type === "QUEUE_PAUSED")).toBe(true);
    expect(intents.map((i) => i.entryId).sort()).toEqual(
      ["entry-10", "entry-4", "entry-5", "entry-6", "entry-7", "entry-8", "entry-9"]
    );
    expect(intents[0].message).toContain("temporarily paused");
  });

  it("maps QUEUE_RESUMED to every patient with an active entry only", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "QUEUE_RESUMED", queueEntryId: undefined })
    );

    expect(intents.every((i) => i.type === "QUEUE_RESUMED")).toBe(true);
    expect(intents).toHaveLength(7);
    expect(intents[0].message).toContain("resumed");
  });
});

describe("NotificationPolicy — events that must NOT create a notification", () => {
  it.each([
    ["QUEUE_CREATED"],
    ["CONSULTATION_COMPLETED"],
    ["PATIENT_CANCELLED"],
    ["WALK_IN_ADDED"],
    ["DOCTOR_DELAYED"],
  ] as const)("%s produces no direct notification", async (eventType) => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType, queueEntryId: "entry-5" })
    );
    expect(intents.filter((i) => i.type !== "TURN_APPROACHING")).toHaveLength(0);
  });

  it("QUEUE_COMPLETED / QUEUE_CANCELLED (enum-only) produce nothing", async () => {
    const { policy } = buildPolicy();
    const completed = await typesOf(
      policy,
      event({ eventType: "QUEUE_COMPLETED" as never })
    );
    const cancelled = await typesOf(
      policy,
      event({ eventType: "QUEUE_CANCELLED" as never })
    );
    expect(completed).toEqual([]);
    expect(cancelled).toEqual([]);
  });
});

describe("NotificationPolicy — TURN_APPROACHING", () => {
  it("notifies waiting entries inside the threshold window after a bubbling event", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "CONSULTATION_COMPLETED", queueEntryId: "entry-4" })
    );

    const approaching = intents.filter((i) => i.type === "TURN_APPROACHING");
    expect(approaching.map((i) => i.entryId).sort()).toEqual([
      "entry-6",
      "entry-7",
    ]);
    expect(approaching[0].dedupeKey).toBe("turn-approaching:queue-1:entry-6");
    expect(approaching[1].dedupeKey).toBe("turn-approaching:queue-1:entry-7");
    const one = approaching.find((i) => i.entryId === "entry-6")!;
    const two = approaching.find((i) => i.entryId === "entry-7")!;
    expect(one.message).toContain("1 patient ahead");
    expect(two.message).toContain("2 patients ahead");
  });

  it("respots the window after a QUEUE_JOINED bubbles through new joins", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "QUEUE_JOINED", queueEntryId: "entry-5" })
    );
    const approaching = intents.filter((i) => i.type === "TURN_APPROACHING");
    // entry-6 (1 ahead) and entry-7 (2 ahead) sit in the window; entry-5 has 0 ahead.
    expect(approaching.map((i) => i.entryId).sort()).toEqual(["entry-6", "entry-7"]);
  });

  it("respects a custom threshold", async () => {
    const { policy } = buildPolicy(1);
    const intents = await typesOf(
      policy,
      event({ eventType: "CONSULTATION_COMPLETED", queueEntryId: "entry-4" })
    );

    const approaching = intents.filter((i) => i.type === "TURN_APPROACHING");
    // Only entry-6 (1 ahead) is inside threshold 1; entry-7 (2 ahead) is not.
    expect(approaching.map((i) => i.entryId)).toEqual(["entry-6"]);
  });

  it("never derives ahead counts from notification code — only from the authoritative position", async () => {
    const { policy } = buildPolicy();
    const intents = await typesOf(
      policy,
      event({ eventType: "CONSULTATION_COMPLETED", queueEntryId: "entry-4" })
    );
    // entry-5 currently has 0 patients ahead (its only predecessor is in
    // consultation); the policy must match QueueService's own count.
    expect(intents.find((i) => i.entryId === "entry-5")).toBeUndefined();
  });
});