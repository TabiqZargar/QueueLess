import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

const SESSION_COOKIE_NAME = "queueless_session";

type NotificationActions = typeof import("@/features/notifications/actions");
type GetNotificationsModule = typeof import("@/features/notifications/get-notifications");

let notifications: NotificationActions;
let readModule: GetNotificationsModule;

function setSession(userId: string) {
  cookieStore.set(SESSION_COOKIE_NAME, `user:${userId}`);
}

async function seedFor(
  userId: string,
  eventId: string,
  type: "QUEUE_JOINED" | "PATIENT_CALLED" = "QUEUE_JOINED"
) {
  const { notificationService } = await import("@/lib/notifications/instance");
  await notificationService.createNotification({
    userId,
    type,
    title: "Title",
    message: "Message",
    channel: "IN_APP",
    queueId: "queue-1",
    entryId: "entry-1",
    eventId,
  });
}

beforeEach(async () => {
  cookieStore.clear();
  vi.resetModules();
  notifications = await import("@/features/notifications/actions");
  readModule = await import("@/features/notifications/get-notifications");
});

describe("getPatientNotifications read", () => {
  it("returns the patient's own notifications and unread count", async () => {
    await seedFor("patient-1", "event-100");
    await seedFor("patient-1", "event-101", "PATIENT_CALLED");
    await seedFor("patient-2", "event-200");

    setSession("patient-1");
    const data = await readModule.getPatientNotifications({
      id: "patient-1",
      name: "Muhammad Hassan",
      role: "PATIENT",
    });

    expect(data.unreadCount).toBe(2);
    expect(data.notifications).toHaveLength(2);
    expect(Object.keys(data.notifications[0]).sort()).toEqual(
      ["createdAt", "id", "message", "readAt", "title", "type"].sort()
    );
  });

  it("throws for a staff caller (read is patient-only)", async () => {
    await seedFor("patient-1", "event-100");
    setSession("user-staff");
    await expect(
      readModule.getPatientNotifications({
        id: "user-staff",
        name: "Staff Operator",
        role: "STAFF",
      })
    ).rejects.toThrow();
  });
});

describe("notification action authorization", () => {
  it("denies a logged-out caller marking a notification read", async () => {
    const result = await notifications.markNotificationAsReadAction("notification-1");
    expect(result).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
      error: "Please sign in to continue.",
    });
  });

  it("denies a staff member marking a notification read", async () => {
    setSession("user-staff");
    const result = await notifications.markNotificationAsReadAction("notification-1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("FORBIDDEN");
  });

  it("denies a doctor using the patient notification action", async () => {
    setSession("user-doctor");
    const result = await notifications.markAllNotificationsAsReadAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("FORBIDDEN");
  });

  it("rejects an invalid notification id with VALIDATION_ERROR", async () => {
    setSession("patient-1");
    const result = await notifications.markNotificationAsReadAction("   ");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("VALIDATION_ERROR");
  });
});

describe("notification action behavior", () => {
  it("marks own notification as read and clears the unread count", async () => {
    await seedFor("patient-1", "event-100");
    setSession("patient-1");

    const { notificationService } = await import("@/lib/notifications/instance");
    const [own] = await notificationService.getNotifications("patient-1");

    const result = await notifications.markNotificationAsReadAction(own.id);
    expect(result.success).toBe(true);
    expect(await notificationService.getUnreadCount("patient-1")).toBe(0);
  });

  it("cannot mark a different user's notification read (idempotent success)", async () => {
    await seedFor("patient-2", "event-100");
    setSession("patient-1");

    const { notificationService } = await import("@/lib/notifications/instance");
    const [other] = await notificationService.getNotifications("patient-2");

    const result = await notifications.markNotificationAsReadAction(other.id);
    expect(result.success).toBe(true);
    expect(await notificationService.getUnreadCount("patient-2")).toBe(1);
  });

  it("treats a missing notification id as a no-op success", async () => {
    setSession("patient-1");
    const result = await notifications.markNotificationAsReadAction("notification-missing");
    expect(result.success).toBe(true);
  });

  it("marks all notifications read for the patient only", async () => {
    await seedFor("patient-1", "event-100");
    await seedFor("patient-1", "event-101", "PATIENT_CALLED");
    await seedFor("patient-2", "event-200");
    setSession("patient-1");

    const result = await notifications.markAllNotificationsAsReadAction();
    expect(result.success).toBe(true);

    const { notificationService } = await import("@/lib/notifications/instance");
    expect(await notificationService.getUnreadCount("patient-1")).toBe(0);
    expect(await notificationService.getUnreadCount("patient-2")).toBe(1);
  });
});