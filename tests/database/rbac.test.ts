import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import { NotificationService } from "@/lib/notifications/service";
import { PrismaNotificationRepository } from "@/lib/notifications/prisma-repository";
import { createIsolatedQueue } from "./test-context";
import {
  buildEntryCookieValue,
  ENTRY_COOKIE_NAME,
} from "@/features/patients/entry-session";
import * as staffActions from "@/features/staff/actions";
import * as doctorActions from "@/features/doctor/actions";
import * as patientActions from "@/features/patients/queue-actions";
import * as notificationActions from "@/features/notifications/actions";

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

let dbQueueService: QueueService;
let dbNotificationService: NotificationService;

vi.mock("@/lib/queue/instance", () => ({
  get queueService() {
    return dbQueueService;
  },
  get getQueueService() {
    return () => dbQueueService;
  },
}));

vi.mock("@/lib/notifications/instance", () => ({
  get notificationService() {
    return dbNotificationService;
  },
}));

function setSession(userId: string) {
  cookieStore.set(SESSION_COOKIE_NAME, `user:${userId}`);
}

function setEntryCookie(queueId: string, entryId: string) {
  cookieStore.set(ENTRY_COOKIE_NAME, buildEntryCookieValue({ queueId, entryId }));
}

beforeEach(() => {
  cookieStore.clear();
  dbQueueService = new QueueService(new PrismaQueueRepository());
  dbNotificationService = new NotificationService(
    new PrismaNotificationRepository()
  );
});

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("Role and ownership authorization against PostgreSQL", () => {
  it("gates staff actions by role and persists the mutation", async () => {
    const queue = await createIsolatedQueue();

    try {
      const unauthenticated = await staffActions.pauseQueueAction(queue.queueId);
      expect(unauthenticated).toMatchObject({
        success: false,
        code: "UNAUTHENTICATED",
        error: "Please sign in to continue.",
      });

      setSession("patient-1");
      const asPatient = await staffActions.pauseQueueAction(queue.queueId);
      expect(asPatient).toMatchObject({ success: false, code: "FORBIDDEN" });

      setSession("user-doctor");
      const asDoctor = await staffActions.pauseQueueAction(queue.queueId);
      expect(asDoctor).toMatchObject({ success: false, code: "FORBIDDEN" });

      setSession("user-staff");
      const asStaff = await staffActions.pauseQueueAction(queue.queueId);
      expect(asStaff).toMatchObject({ success: true, message: "Queue paused." });

      expect((await dbQueueService.getQueue(queue.queueId))?.status).toBe("PAUSED");
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("restricts consultation transitions to doctors", async () => {
    const entryId = `entry-rbac-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      existingPatientIds: ["patient-1"],
      entries: [
        {
          id: entryId,
          patientId: "patient-1",
          tokenNumber: 1,
          status: "CALLED",
          calledAt: new Date().toISOString(),
        },
      ],
    });

    try {
      setSession("patient-1");
      const asPatient = await doctorActions.startConsultationAction(entryId);
      expect(asPatient).toMatchObject({ success: false, code: "FORBIDDEN" });

      setSession("user-staff");
      const asStaff = await doctorActions.startConsultationAction(entryId);
      expect(asStaff).toMatchObject({ success: false, code: "FORBIDDEN" });

      setSession("user-doctor");
      const asDoctor = await doctorActions.startConsultationAction(entryId);
      expect(asDoctor).toMatchObject({ success: true });

      const stored = await dbQueueService.getQueueEntry(entryId);
      expect(stored?.status).toBe("IN_CONSULTATION");
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("prevents a patient from cancelling another patient's entry", async () => {
    const ownEntry = `entry-rbac-own-${randomUUID()}`;
    const otherEntry = `entry-rbac-other-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      existingPatientIds: ["patient-1", "patient-2"],
      entries: [
        {
          id: ownEntry,
          patientId: "patient-1",
          tokenNumber: 1,
          status: "WAITING",
        },
        {
          id: otherEntry,
          patientId: "patient-2",
          tokenNumber: 2,
          status: "WAITING",
        },
      ],
    });

    try {
      setSession("patient-1");
      setEntryCookie(queue.queueId, otherEntry);
      const cancelOther = await patientActions.cancelQueueEntryAction();
      expect(cancelOther).toMatchObject({
        success: false,
        code: "FORBIDDEN",
        error: "You are not authorized to cancel this entry.",
      });
      expect((await dbQueueService.getQueueEntry(otherEntry))?.status).toBe("WAITING");
      expect(cookieStore.has(ENTRY_COOKIE_NAME)).toBe(true);

      setEntryCookie(queue.queueId, ownEntry);
      const cancelOwn = await patientActions.cancelQueueEntryAction();
      expect(cancelOwn).toEqual({ success: true });
      expect((await dbQueueService.getQueueEntry(ownEntry))?.status).toBe("CANCELLED");
      expect(cookieStore.has(ENTRY_COOKIE_NAME)).toBe(false);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("refuses cancellation before sign-in", async () => {
    const entryId = `entry-rbac-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      existingPatientIds: ["patient-1"],
      entries: [
        {
          id: entryId,
          patientId: "patient-1",
          tokenNumber: 1,
          status: "WAITING",
        },
      ],
    });

    try {
      setEntryCookie(queue.queueId, entryId);
      const result = await patientActions.cancelQueueEntryAction();
      expect(result).toMatchObject({
        success: false,
        code: "UNAUTHENTICATED",
        error: "Please sign in to cancel your entry.",
      });
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("persists a join performed through the real server action", async () => {
    const queue = await createIsolatedQueue({ existingPatientIds: ["patient-1"] });

    try {
      setSession("patient-1");
      const formData = new FormData();
      formData.set("queueId", queue.queueId);
      formData.set("name", "Muhammad Hassan");
      formData.set("phone", "+92-300-0000001");

      const result = await patientActions.joinQueueAction({}, formData);
      expect(result.error).toBeUndefined();
      expect(result.result?.tokenNumber).toBe(1);
      expect(result.result?.position).toBe(1);
      expect(cookieStore.has(ENTRY_COOKIE_NAME)).toBe(true);

      const entries = await dbQueueService.getQueueEntries(queue.queueId);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        patientId: "patient-1",
        tokenNumber: 1,
        status: "WAITING",
      });
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("restricts mark-as-read to the PATIENT role and the notification owner", async () => {
    const entryId = `entry-rbac-read-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      existingPatientIds: ["patient-1"],
      entries: [
        {
          id: entryId,
          patientId: "patient-1",
          tokenNumber: 1,
          status: "WAITING",
        },
      ],
    });
    const notification = await dbNotificationService.createNotification({
      userId: "patient-1",
      type: "PATIENT_CALLED",
      title: "You're being called",
      message: "Your token A-9 is being called.",
      channel: "IN_APP",
      queueId: queue.queueId,
      entryId,
    });

    try {
      setSession("user-staff");
      const asStaff = await notificationActions.markNotificationAsReadAction(
        notification.id
      );
      expect(asStaff).toMatchObject({ success: false, code: "FORBIDDEN" });

      setSession("user-doctor");
      const asDoctor = await notificationActions.markNotificationAsReadAction(
        notification.id
      );
      expect(asDoctor).toMatchObject({ success: false, code: "FORBIDDEN" });

      // Ownership scoping lives in the repository: a mark-as-read for a
      // non-owner never touches the row (and the action has no cross-user
      // escape hatch because the user id always comes from the session).
      await dbNotificationService.markAsRead(notification.id, "user-doctor");
      const stillUnread = await dbNotificationService.getNotifications("patient-1");
      expect(
        stillUnread.find((n) => n.id === notification.id)?.readAt
      ).toBeNull();

      setSession("patient-1");
      const own = await notificationActions.markNotificationAsReadAction(
        notification.id
      );
      expect(own).toEqual({ success: true });

      const nowRead = await dbNotificationService.getNotifications("patient-1");
      expect(nowRead.find((n) => n.id === notification.id)?.readAt).not.toBeNull();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);
});