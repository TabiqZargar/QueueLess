import { describe, expect, it } from "vitest";
import { MockNotificationRepository } from "@/lib/notifications/mock-repository";
import { NotificationService } from "@/lib/notifications/service";
import { Notification } from "@/lib/notifications/types";

function buildService() {
  return new NotificationService(new MockNotificationRepository());
}

function factory(overrides: Partial<Parameters<NotificationService["createNotification"]>[0]> = {}) {
  return {
    userId: "patient-1",
    type: "QUEUE_JOINED" as const,
    title: "Queued successfully",
    message: "You have joined Dr. Ahmed Khan's queue. Your token is A-28.",
    channel: "IN_APP" as const,
    queueId: "queue-1",
    entryId: "entry-11",
    eventId: "event-100",
    ...overrides,
  };
}

describe("NotificationService (domain)", () => {
  it("creates an unread IN_APP notification", async () => {
    const service = buildService();
    const created = await service.createNotification(factory());

    expect(created.id).toBeDefined();
    expect(created.readAt).toBeNull();
    expect(created.channel).toBe("IN_APP");
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.type).toBe("QUEUE_JOINED");
  });

  it("lists only the requesting user's notifications newest-first", async () => {
    const service = buildService();
    await service.createNotification(factory({ eventId: "event-100" }));
    await service.createNotification(
      factory({ eventId: "event-101", type: "PATIENT_CALLED", title: "Called", message: "Proceed." })
    );
    await service.createNotification(
      factory({ userId: "patient-2", eventId: "event-200" })
    );

    const list = await service.getNotifications("patient-1");
    expect(list).toHaveLength(2);
    expect(list[0].type).toBe("PATIENT_CALLED");
    expect(list[1].type).toBe("QUEUE_JOINED");
    expect(list[0].createdAt >= list[1].createdAt).toBe(true);
  });

  it("returns an empty list for a user with no notifications", async () => {
    const service = buildService();
    await service.createNotification(factory({ userId: "patient-2" }));

    expect(await service.getNotifications("patient-1")).toEqual([]);
  });

  it("counts unread notifications per user", async () => {
    const service = buildService();
    await service.createNotification(factory({ eventId: "event-100" }));
    await service.createNotification(
      factory({ eventId: "event-101", type: "PATIENT_CALLED", title: "Called", message: "Proceed." })
    );
    await service.createNotification(factory({ userId: "patient-2" }));

    expect(await service.getUnreadCount("patient-1")).toBe(2);
    expect(await service.getUnreadCount("patient-2")).toBe(1);
  });

  it("marks a single own notification as read", async () => {
    const service = buildService();
    const created = await service.createNotification(factory());

    const marked = await service.markAsRead(created.id, "patient-1");
    expect(marked).toBe(true);
    const list = await service.getNotifications("patient-1");
    expect(list[0].readAt).not.toBeNull();
    expect(await service.getUnreadCount("patient-1")).toBe(0);
  });

  it("cannot mark another user's notification as read (no-op)", async () => {
    const service = buildService();
    const created = await service.createNotification(factory({ userId: "patient-2" }));

    const marked = await service.markAsRead(created.id, "patient-1");
    expect(marked).toBe(false);
    expect(await service.getUnreadCount("patient-2")).toBe(1);
  });

  it("treats a missing notification id as an idempotent no-op", async () => {
    const service = buildService();
    expect(await service.markAsRead("notification-missing", "patient-1")).toBe(false);
  });

  it("marks all own notifications as read and returns the marked count", async () => {
    const service = buildService();
    const first = await service.createNotification(factory({ eventId: "event-100" }));
    await service.createNotification(
      factory({ eventId: "event-101", type: "PATIENT_CALLED", title: "Called", message: "Proceed." })
    );
    await service.createNotification(factory({ userId: "patient-2" }));

    expect(await service.markAsRead(first.id, "patient-1")).toBe(true);

    const marked = await service.markAllAsRead("patient-1");
    expect(marked).toBe(1); // only the still-unread one
    expect(await service.getUnreadCount("patient-1")).toBe(0);
    // other user's notifications untouched
    expect(await service.getUnreadCount("patient-2")).toBe(1);
  });

  it("deduplicates by user + type + event id", async () => {
    const service = buildService();
    const first = await service.createNotification(factory({ eventId: "event-100" }));
    const second = await service.createNotification(factory({ eventId: "event-100" }));

    expect(second.id).toBe(first.id);
    expect(await service.getNotifications("patient-1")).toHaveLength(1);
  });

  it("deduplicates by user + type + dedupe key", async () => {
    const service = buildService();
    const key = "turn-approaching:queue-1:entry-9";
    const first = await service.createNotification(
      factory({ type: "TURN_APPROACHING", title: "Turn", message: "1 ahead.", dedupeKey: key })
    );
    const second = await service.createNotification(
      factory({ type: "TURN_APPROACHING", title: "Turn", message: "1 ahead.", dedupeKey: key })
    );

    expect(second.id).toBe(first.id);
    expect(await service.getNotifications("patient-1")).toHaveLength(1);
  });

  it("keeps distinct notifications when only the type differs", async () => {
    const service = buildService();
    await service.createNotification(factory({ eventId: "event-100" }));
    await service.createNotification(
      factory({ eventId: "event-100", type: "PATIENT_CALLED", title: "Called", message: "Proceed." })
    );

    expect(await service.getNotifications("patient-1")).toHaveLength(2);
  });

  it("keeps distinct notifications when only the event id differs", async () => {
    const service = buildService();
    await service.createNotification(factory({ eventId: "event-100" }));
    await service.createNotification(factory({ eventId: "event-200" }));

    expect(await service.getNotifications("patient-1")).toHaveLength(2);
  });

  it("never exposes internal or sensitive fields in the summary DTO", async () => {
    const service = buildService();
    await service.createNotification(factory());

    const [summary] = await service.getNotifications("patient-1");
    expect(Object.keys(summary).sort()).toEqual(
      ["createdAt", "id", "message", "readAt", "title", "type"].sort()
    );
    expect(summary).not.toHaveProperty("userId");
    expect(summary).not.toHaveProperty("entryId");
    expect(summary).not.toHaveProperty("queueId");
  });
});

describe("MockNotificationRepository (dedup contract)", () => {
  it("handles seeded notifications without mutation", async () => {
    const seed: Notification[] = [
      {
        id: "notification-seed",
        userId: "patient-1",
        type: "QUEUE_JOINED",
        title: "Queued",
        message: "Welcome.",
        channel: "IN_APP",
        createdAt: "2024-01-20T10:00:00.000Z",
        readAt: null,
      },
    ];
    const repo = new MockNotificationRepository(seed);
    expect(await repo.listByUser("patient-1")).toHaveLength(1);

    const created = await repo.create({
      userId: "patient-1",
      type: "QUEUE_PAUSED",
      title: "Paused",
      message: "Paused.",
      channel: "IN_APP",
      eventId: "event-300",
    });
    expect(created.id).toBe("notification-1000");
  });
});