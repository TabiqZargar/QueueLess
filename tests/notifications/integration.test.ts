import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { NotificationPolicy } from "@/lib/notifications/policy";
import { MockNotificationRepository } from "@/lib/notifications/mock-repository";
import { NotificationService } from "@/lib/notifications/service";
import { InAppNotificationDelivery } from "@/lib/notifications/delivery";
import {
  QueueEventNotificationHandler,
  SafeNotificationHandler,
} from "@/lib/notifications/event-handler";
import type { NotificationEventHandler } from "@/lib/notifications/event-handler";
import type { QueueEventPublisher } from "@/lib/realtime/publisher";
import type { QueueRealtimeEventInput } from "@/lib/realtime/events";

function buildStack(options?: { threshold?: number }) {
  const repository = new MockQueueRepository();
  const notificationRepository = new MockNotificationRepository();
  const service = new NotificationService(notificationRepository);

  let serviceRef!: QueueService;
  const policy = new NotificationPolicy(
    { getQueueService: () => serviceRef },
    { turnApproachingThreshold: options?.threshold ?? 2 }
  );
  const handler = new SafeNotificationHandler(
    new QueueEventNotificationHandler(
      policy,
      service,
      new InAppNotificationDelivery()
    )
  );
  serviceRef = new QueueService(repository, undefined, handler);

  return {
    queueService: serviceRef,
    queueRepository: repository,
    notificationService: service,
    notificationRepository,
  };
}

type Published = { queueId: string; event: QueueRealtimeEventInput };

class RecordingPublisher implements QueueEventPublisher {
  readonly published: Published[] = [];
  async publish(queueId: string, event: QueueRealtimeEventInput): Promise<void> {
    this.published.push({ queueId, event });
  }
}

describe("Queue mutation → notification pipeline (integration)", () => {
  it("creates a QUEUE_JOINED notification on join", async () => {
    const { queueService, notificationService } = buildStack();

    await queueService.joinQueue({ queueId: "queue-1", patientId: "patient-1" });

    const list = await notificationService.getNotifications("patient-1");
    const joined = list.find((n) => n.type === "QUEUE_JOINED");
    expect(joined).toBeDefined();
    expect(joined!.message).toContain("Dr. Ahmed Khan's queue");
    expect(joined!.message).toContain("A-28");
    expect(joined!.readAt).toBeNull();
  });

  it("creates a PATIENT_CALLED notification when the next patient is called", async () => {
    const { queueService, notificationService } = buildStack();

    // Free queue-1 of its in-consultation entry so entry-5 can be called.
    await queueService.completeConsultation("entry-4");
    await queueService.callNextPatient("queue-1");

    const list = await notificationService.getNotifications("patient-2");
    const called = list.find((n) => n.type === "PATIENT_CALLED");
    expect(called).toBeDefined();
    expect(called!.message).toContain("A-22");
  });

  it("creates a CONSULTATION_STARTED notification", async () => {
    const { queueService, notificationService } = buildStack();

    // Free queue-1 of its active consultation, call the next patient (entry-5
    // → CALLED), then start their consultation.
    await queueService.completeConsultation("entry-4");
    await queueService.callNextPatient("queue-1");
    await queueService.startConsultation("entry-5");

    const list = await notificationService.getNotifications("patient-2");
    const started = list.find((n) => n.type === "CONSULTATION_STARTED");
    expect(started).toBeDefined();
    expect(started!.message).toContain("A-22");
  });

  it("creates a NO_SHOW notification for the affected patient", async () => {
    const { queueService, notificationService } = buildStack();

    await queueService.markNoShow("entry-6");

    const list = await notificationService.getNotifications("patient-3");
    const noShow = list.find((n) => n.type === "NO_SHOW");
    expect(noShow).toBeDefined();
    expect(noShow!.message).toContain("no-show");
  });

  it("notifies each patient with an active entry once when the queue is paused", async () => {
    const { queueService, notificationService } = buildStack();

    await queueService.pauseQueue("queue-1");

    // entry-4 (p1) plus WAITING entry-5..entry-10 (p2,p3,p1,...) are active.
    // A user with several active entries still receives exactly one.
    for (const user of ["patient-1", "patient-2", "patient-3"]) {
      const paused = (await notificationService.getNotifications(user)).filter(
        (n) => n.type === "QUEUE_PAUSED"
      );
      expect(paused).toHaveLength(1);
      expect(paused[0].message).toContain("temporarily paused");
    }
    expect(await notificationService.getUnreadCount("patient-1")).toBeGreaterThan(0);
  });

  it("notifies patients when the queue resumes", async () => {
    const { queueService, notificationService } = buildStack();

    await queueService.pauseQueue("queue-1");
    await queueService.resumeQueue("queue-1");

    const resumed = (await notificationService.getNotifications("patient-3")).filter(
      (n) => n.type === "QUEUE_RESUMED"
    );
    expect(resumed).toHaveLength(1);
    expect(resumed[0].message).toContain("resumed");
  });

  it("does not notify a patient who cancelled their own entry", async () => {
    const { queueService, notificationRepository } = buildStack();

    await queueService.cancelQueueEntry("entry-5");

    // The PATIENT_CANCELLED event must never surface as a notification: no
    // notification (for any recipient) references the cancelled entry.
    const forCanceller = await notificationRepository.listByUser("patient-2");
    expect(forCanceller.some((n) => n.entryId === "entry-5")).toBe(false);
    const all = [
      ...(await notificationRepository.listByUser("patient-1")),
      ...(await notificationRepository.listByUser("patient-2")),
      ...(await notificationRepository.listByUser("patient-3")),
    ];
    expect(all.some((n) => n.entryId === "entry-5")).toBe(false);
  });

  it("produces no notifications when a mutation fails", async () => {
    const { queueService, notificationRepository } = buildStack();

    // entry-4 is already IN_CONSULTATION → a second consultation start fails.
    await expect(
      queueService.startConsultation("entry-4")
    ).rejects.toThrow();

    expect(await notificationRepository.listByUser("patient-1")).toEqual([]);
    expect(await notificationRepository.listByUser("patient-2")).toEqual([]);
    expect(await notificationRepository.listByUser("patient-3")).toEqual([]);
  });

  it("evaluates TURN_APPROACHING through the real quota service after a bubbling event", async () => {
    const { queueService, notificationService } = buildStack();

    await queueService.completeConsultation("entry-4");

    const approachingP1 = (
      await notificationService.getNotifications("patient-1")
    ).filter((n) => n.type === "TURN_APPROACHING");
    const approachingP3 = (
      await notificationService.getNotifications("patient-3")
    ).filter((n) => n.type === "TURN_APPROACHING");

    // entry-6 (p3) has 1 ahead, entry-7 (p1) has 2 ahead — both inside the default window.
    expect(
      approachingP3.some((n) => n.message.includes("1 patient ahead"))
    ).toBe(true);
    expect(
      approachingP1.some((n) => n.message.includes("2 patients ahead"))
    ).toBe(true);
  });

  it("uses the injected threshold", async () => {
    const { queueService, notificationService } = buildStack({ threshold: 1 });

    await queueService.completeConsultation("entry-4");

    const approaching = (
      await notificationService.getNotifications("patient-3")
    ).filter((n) => n.type === "TURN_APPROACHING");
    expect(approaching).toHaveLength(1);
    expect(approaching[0].message).toContain("1 patient ahead");

    const none = (
      await notificationService.getNotifications("patient-1")
    ).filter((n) => n.type === "TURN_APPROACHING");
    expect(none).toEqual([]); // entry-7 has 2 ahead, above threshold 1
  });
});

describe("no-loop and isolation guarantees", () => {
  it("a mutation emits exactly one realtime event and one queue event (notifications add none)", async () => {
    const repository = new MockQueueRepository();
    const recordPublisher = new RecordingPublisher();
    const notificationRepository = new MockNotificationRepository();
    const service = new NotificationService(notificationRepository);

    let serviceRef!: QueueService;
    const policy = new NotificationPolicy({ getQueueService: () => serviceRef });
    const handler = new SafeNotificationHandler(
      new QueueEventNotificationHandler(
        policy,
        service,
        new InAppNotificationDelivery()
      )
    );
    serviceRef = new QueueService(repository, recordPublisher, handler);

    const seedJoined = (await repository.getQueueEvents("queue-1")).filter(
      (e) => e.eventType === "QUEUE_JOINED"
    ).length;

    await serviceRef.joinQueue({ queueId: "queue-1", patientId: "patient-1" });

    expect(recordPublisher.published).toHaveLength(1);
    expect(recordPublisher.published[0].event.type).toBe("QUEUE_UPDATED");

    // Notification processing must never create queue events of its own: the
    // join records exactly one new QUEUE_JOINED event on top of the seeded rows.
    const joined = (await repository.getQueueEvents("queue-1")).filter(
      (e) => e.eventType === "QUEUE_JOINED"
    ).length;
    expect(joined).toBe(seedJoined + 1);
  });

  it("notification deduplication keeps one record per event-driven notification", async () => {
    const { queueService, notificationService } = buildStack();

    // One QUEUE_JOINED event → one notification even across the bubbling scan.
    await queueService.joinQueue({ queueId: "queue-1", patientId: "patient-1" });

    const joined = (await notificationService.getNotifications("patient-1")).filter(
      (n) => n.type === "QUEUE_JOINED"
    );
    expect(joined).toHaveLength(1);
  });

  it("a fully broken notification pipeline never fails the queue mutation", async () => {
    const repository = new MockQueueRepository();
    const broken: NotificationEventHandler = {
      async handle() {
        throw new Error("notification pipeline down");
      },
    };
    const safe = new SafeNotificationHandler(broken);
    const service = new QueueService(repository, undefined, safe);

    await expect(
      service.joinQueue({ queueId: "queue-1", patientId: "patient-1" })
    ).resolves.toBeDefined();

    const events = await repository.getQueueEvents("queue-1");
    expect(events.some((e) => e.eventType === "QUEUE_JOINED")).toBe(true);
  });

  it("a throwing inner notification handler latches the safe wrapper", async () => {
    const inner: NotificationEventHandler = {
      async handle() {
        throw new Error("boom");
      },
    };
    const safe = new SafeNotificationHandler(inner);
    expect(safe.isHealthy()).toBe(true);

    await expect(
      safe.handle({
        id: "event-1",
        queueId: "queue-1",
        eventType: "QUEUE_JOINED",
        timestamp: new Date(),
      })
    ).resolves.toBeUndefined();
    expect(safe.isHealthy()).toBe(false);
  });
});