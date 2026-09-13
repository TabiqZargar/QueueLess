import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "../../prisma/db";
import { createIsolatedQueue } from "./test-context";
import { PrismaNotificationRepository } from "@/lib/notifications/prisma-repository";
import { NotificationService } from "@/lib/notifications/service";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import type { QueueEventType } from "@/types";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("Database integrity constraints", () => {
  it("rejects queue entries whose queue or patient does not exist", async () => {
    const queue = await createIsolatedQueue({ existingPatientIds: ["patient-1"] });
    const stamp = new Date().toISOString();

    try {
      await expect(
        db.orm.public.QueueEntry.create({
          id: `entry-fk-q-${randomUUID()}`,
          queueId: `missing-queue-${randomUUID()}`,
          patientId: "patient-1",
          tokenNumber: 99,
          entryType: "APPOINTMENT",
          status: "WAITING",
          joinedAt: stamp,
        })
      ).rejects.toBeDefined();

      await expect(
        db.orm.public.QueueEntry.create({
          id: `entry-fk-p-${randomUUID()}`,
          queueId: queue.queueId,
          patientId: `missing-patient-${randomUUID()}`,
          tokenNumber: 99,
          entryType: "APPOINTMENT",
          status: "WAITING",
          joinedAt: stamp,
        })
      ).rejects.toBeDefined();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("rejects orphaned queue events and unknown event types", async () => {
    const queue = await createIsolatedQueue();
    const stamp = new Date().toISOString();

    try {
      await expect(
        db.orm.public.QueueEvent.create({
          id: `event-fk-${randomUUID()}`,
          queueId: `missing-queue-${randomUUID()}`,
          queueEntryId: null,
          actorUserId: null,
          eventType: "QUEUE_JOINED",
          timestamp: stamp,
        })
      ).rejects.toBeDefined();

      await expect(
        db.orm.public.QueueEvent.create({
          id: `event-type-${randomUUID()}`,
          queueId: queue.queueId,
          queueEntryId: null,
          actorUserId: null,
          eventType: "NOT_A_REAL_EVENT" as unknown as QueueEventType,
          timestamp: stamp,
        })
      ).rejects.toBeDefined();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("enforces one token per queue through a unique constraint", async () => {
    const queue = await createIsolatedQueue({ existingPatientIds: ["patient-1"] });
    const stamp = new Date().toISOString();

    try {
      const first = await db.orm.public.QueueEntry.create({
        id: `entry-token-${randomUUID()}`,
        queueId: queue.queueId,
        patientId: "patient-1",
        tokenNumber: 41,
        entryType: "APPOINTMENT",
        status: "WAITING",
        joinedAt: stamp,
      });
      expect(first.tokenNumber).toBe(41);

      await expect(
        db.orm.public.QueueEntry.create({
          id: `entry-token-dup-${randomUUID()}`,
          queueId: queue.queueId,
          patientId: "patient-1",
          tokenNumber: 41,
          entryType: "APPOINTMENT",
          status: "WAITING",
          joinedAt: stamp,
        })
      ).rejects.toBeDefined();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("enforces notification deduplication at the database level", async () => {
    const queue = await createIsolatedQueue({ existingPatientIds: ["patient-1"] });

    try {
      const eventId = `event-dedupe-${randomUUID()}`;
      const first = await db.orm.public.Notification.create({
        id: randomUUID(),
        userId: "patient-1",
        type: "PATIENT_CALLED",
        title: "Called",
        message: "Your token A-1 is being called.",
        channel: "IN_APP",
        queueId: queue.queueId,
        entryId: null,
        eventId,
        dedupeKey: null,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
      expect(first.eventId).toBe(eventId);

      await expect(
        db.orm.public.Notification.create({
          id: randomUUID(),
          userId: "patient-1",
          type: "PATIENT_CALLED",
          title: "Duplicate",
          message: "Duplicate row.",
          channel: "IN_APP",
          queueId: queue.queueId,
          entryId: null,
          eventId,
          dedupeKey: null,
          createdAt: new Date().toISOString(),
          readAt: null,
        })
      ).rejects.toBeDefined();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("round-trips JSON event metadata without loss", async () => {
    const queue = await createIsolatedQueue();
    const repository = new PrismaQueueRepository();

    try {
      await repository.addQueueEvent({
        queueId: queue.queueId,
        queueEntryId: undefined,
        actorUserId: undefined,
        eventType: "DOCTOR_DELAYED",
        metadata: {
          minutes: 15,
          note: "holiday traffic",
          nested: { reason: "roadworks" },
        },
      });

      const events = await repository.getQueueEvents(queue.queueId);
      const delayed = events.find((e) => e.eventType === "DOCTOR_DELAYED");
      expect(delayed?.metadata).toEqual({
        minutes: 15,
        note: "holiday traffic",
        nested: { reason: "roadworks" },
      });
      expect(delayed?.timestamp).toBeInstanceOf(Date);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("persists every notification field and the read state", async () => {
    const queue = await createIsolatedQueue({ existingPatientIds: ["patient-1"] });
    const notificationService = new NotificationService(
      new PrismaNotificationRepository()
    );

    try {
      const entry = await db.orm.public.QueueEntry.create({
        id: `entry-persist-${randomUUID()}`,
        queueId: queue.queueId,
        patientId: "patient-1",
        tokenNumber: 42,
        entryType: "APPOINTMENT",
        status: "WAITING",
        joinedAt: new Date().toISOString(),
      });
      const entryId = entry.id;
      const created = await notificationService.createNotification({
        userId: "patient-1",
        type: "CONSULTATION_STARTED",
        title: "Consultation started",
        message: "Your consultation (A-7) has started.",
        channel: "IN_APP",
        queueId: queue.queueId,
        entryId,
      });

      const stored = await db.orm.public.Notification.where({ id: created.id }).first();
      expect(stored).toMatchObject({
        userId: "patient-1",
        type: "CONSULTATION_STARTED",
        title: "Consultation started",
        channel: "IN_APP",
        queueId: queue.queueId,
        entryId,
        readAt: null,
      });
      expect(new Date(stored!.createdAt).getTime()).not.toBeNaN();

      await notificationService.markAsRead(created.id, "patient-1");
      const read = await db.orm.public.Notification.where({ id: created.id }).first();
      expect(read?.readAt).not.toBeNull();
      expect(new Date(read!.readAt!).getTime()).not.toBeNaN();
    } finally {
      await queue.cleanup();
    }
  }, 30_000);
});