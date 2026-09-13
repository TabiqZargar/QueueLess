import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildPostgresStack, createIsolatedQueue } from "./test-context";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import { QueueService } from "@/lib/queue/queue-service";
import { PrismaNotificationRepository } from "@/lib/notifications/prisma-repository";
import { NotificationService } from "@/lib/notifications/service";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("Persistence across repository instances and process restarts", () => {
  it("reads every artifact back through fresh repository instances", async () => {
    const { queueService } = buildPostgresStack();
    const patient = `persist-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      patientIds: [patient],
      averageConsultationMinutes: 7,
    });

    try {
      const joined = await queueService.joinQueue({
        queueId: queue.queueId,
        patientId: patient,
      });
      await queueService.callNextPatient(queue.queueId);

      // Brand-new repository and service instances — no shared memory.
      const freshRepository = new PrismaQueueRepository();
      const freshService = new QueueService(freshRepository);

      const persistedQueue = await freshService.getQueue(queue.queueId);
      expect(persistedQueue?.id).toBe(queue.queueId);
      expect(persistedQueue?.status).toBe("ACTIVE");
      expect(persistedQueue?.departmentId).toBe(queue.departmentId);

      const entry = await freshService.getQueueEntry(joined.entry.id);
      expect(entry).toMatchObject({
        id: joined.entry.id,
        patientId: patient,
        tokenNumber: 1,
        status: "CALLED",
      });
      expect(entry?.joinedAt).toBeInstanceOf(Date);
      expect(entry?.calledAt).toBeInstanceOf(Date);

      const stats = await freshRepository.getQueueStatistics(queue.queueId);
      expect(stats).toMatchObject({
        totalWaiting: 0,
        totalInQueue: 1,
        currentToken: 0,
      });

      const events = await freshRepository.getQueueEvents(queue.queueId);
      expect(events.map((e) => e.eventType).sort()).toEqual([
        "PATIENT_CALLED",
        "QUEUE_JOINED",
      ]);

      const freshNotifications = new NotificationService(
        new PrismaNotificationRepository()
      );
      const summary = await freshNotifications.getNotifications(patient);
      expect(summary.map((n) => n.type).sort()).toEqual([
        "PATIENT_CALLED",
        "QUEUE_JOINED",
      ]);
      const joinedNotification = summary.find((n) => n.type === "QUEUE_JOINED");
      expect(joinedNotification?.readAt).toBeNull();
      expect(joinedNotification?.title).toBe("Queued successfully");

      // The queue entry reference survives in the domain long after the
      // in-memory record of the join is gone.
      const position = await freshService.getQueuePosition(joined.entry.id);
      expect(position.currentServingToken).toBe(1);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("keeps state readable by a separate node process once the writer has exited", async () => {
    const { queueService } = buildPostgresStack();
    const patient = `restart-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      patientIds: [patient],
      averageConsultationMinutes: 7,
    });

    const tempDir = mkdtempSync(join(process.cwd(), ".queueless-probe-"));
    const probeFile = join(tempDir, "probe.mjs");
    const dbUrl = pathToFileURL(join(process.cwd(), "prisma", "db.ts")).href;

    try {
      const joined = await queueService.joinQueue({
        queueId: queue.queueId,
        patientId: patient,
      });
      await queueService.callNextPatient(queue.queueId);

      // The probe mimics an application restart: a brand-new process that has
      // nothing in memory and must re-derive its state from PostgreSQL only.
      writeFileSync(
        probeFile,
        `
import "dotenv/config";
import { db } from ${JSON.stringify(dbUrl)};

const queueId = process.argv[2];
const queue = await db.orm.public.Queue.where({ id: queueId }).first();
const entries = await db.orm.public.QueueEntry.where({ queueId }).all();
const events = await db.orm.public.QueueEvent.where({ queueId }).all();
const notifications = await db.orm.public.Notification.where({ queueId }).all();

process.stdout.write(
  JSON.stringify({
    queue: queue
      ? { id: queue.id, status: queue.status, currentToken: queue.currentToken }
      : null,
    entries: entries.map((e) => ({
      id: e.id,
      tokenNumber: e.tokenNumber,
      status: e.status,
      patientId: e.patientId,
    })),
    eventTypes: events.map((e) => e.eventType).sort(),
    notifications: notifications.map((n) => ({
      type: n.type,
      readAt: n.readAt,
    })),
  })
);
`
      );

      const result = spawnSync(
        process.execPath,
        ["--experimental-strip-types", probeFile, queue.queueId],
        { cwd: process.cwd(), env: process.env, encoding: "utf8", timeout: 60_000 }
      );

      expect(result.status, result.stderr ?? "probe failed").toBe(0);
      expect(result.error).toBeUndefined();

      const snapshot = JSON.parse(result.stdout) as {
        queue: { id: string; status: string; currentToken: number } | null;
        entries: {
          id: string;
          tokenNumber: number;
          status: string;
          patientId: string;
        }[];
        eventTypes: string[];
        notifications: { type: string; readAt: string | null }[];
      };

      expect(snapshot.queue).toEqual({
        id: queue.queueId,
        status: "ACTIVE",
        currentToken: 0,
      });
      expect(snapshot.entries).toHaveLength(1);
      expect(snapshot.entries[0]).toMatchObject({
        id: joined.entry.id,
        tokenNumber: 1,
        status: "CALLED",
        patientId: patient,
      });
      expect(snapshot.eventTypes).toEqual([
        "PATIENT_CALLED",
        "QUEUE_JOINED",
      ]);
      expect(snapshot.notifications).toContainEqual({
        type: "PATIENT_CALLED",
        readAt: null,
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
      await queue.cleanup();
    }
  }, 60_000);
});