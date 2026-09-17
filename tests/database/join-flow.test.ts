import { describe, expect, it } from "vitest";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import {
  getCurrentPatientRegistration,
  patientStatusPath,
} from "@/features/patients/active-registration";
import { QueuePausedError } from "@/lib/queue/errors";
import {
  createIsolatedQueue,
  buildLeanQueueService,
} from "./test-context";

/**
 * Regression coverage for the patient Join Queue flow. These tests exercise the
 * real PostgreSQL pipeline behind the /join page (repository -> service ->
 * active-registration redirect) so the doctor/queue selection is verified to be
 * sourced from durable data, never from hardcoded UI stubs.
 */
describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("patient join flow (database)", () => {
  it(
    "a patient with no active registration sees an empty active list (join page is reachable)",
    { timeout: 60_000 },
    async () => {
      const patientId = `join-free-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        const active = await service.getActiveRegistrationsForPatient(patientId);
        const current = await getCurrentPatientRegistration(patientId, service);

        expect(active).toEqual([]);
        expect(current).toBeNull();
        expect(patientStatusPath(current)).toBeNull();
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "listQueues returns the real joinable queue with doctor, department and clinic populated",
    { timeout: 60_000 },
    async () => {
      const ctx = await createIsolatedQueue();

      try {
        const repository = new PrismaQueueRepository();
        const queues = await repository.listQueues();

        const listedQueue = queues.find((q) => q.id === ctx.queueId);
        expect(listedQueue).toBeDefined();
        expect(listedQueue?.status).toBe("ACTIVE");
        expect(listedQueue?.doctor?.displayName).toBe("QueueLess Test Doctor");
        expect(listedQueue?.departmentName).toBe("QueueLess Test Department");
        expect(listedQueue?.clinicName).toBe("QueueLess Test Clinic");
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "joining a real queue creates a durable WAITING QueueEntry in the database",
    { timeout: 60_000 },
    async () => {
      const patientId = `join-patient-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        const joined = await service.joinQueue({
          queueId: ctx.queueId,
          patientId,
        });

        expect(joined.entry.status).toBe("WAITING");
        expect(joined.entry.queueId).toBe(ctx.queueId);
        expect(joined.entry.patientId).toBe(patientId);

        const repository = new PrismaQueueRepository();
        const persisted = await repository.getQueueEntry(joined.entry.id);
        expect(persisted).not.toBeNull();
        expect(persisted?.status).toBe("WAITING");
        expect(persisted?.queueId).toBe(ctx.queueId);
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "a patient with an active registration resolves a status redirect (join page would redirect)",
    { timeout: 60_000 },
    async () => {
      const patientId = `join-redirect-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        const joined = await service.joinQueue({
          queueId: ctx.queueId,
          patientId,
        });

        const current = await getCurrentPatientRegistration(patientId, service);
        expect(current?.id).toBe(joined.entry.id);
        expect(patientStatusPath(current)).toBe(
          `/queue/${ctx.queueId}/status`
        );
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "after cancel, the same patient has no active registration and the join page is available again",
    { timeout: 60_000 },
    async () => {
      const patientId = `join-cancel-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        const joined = await service.joinQueue({
          queueId: ctx.queueId,
          patientId,
        });

        await service.cancelQueueEntry(joined.entry.id);

        const active = await service.getActiveRegistrationsForPatient(patientId);
        const current = await getCurrentPatientRegistration(patientId, service);

        expect(active).toEqual([]);
        expect(current).toBeNull();
        expect(patientStatusPath(current)).toBeNull();
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "a paused queue rejects new patients (QueuePausedError) so the UI cannot bypass validation",
    { timeout: 60_000 },
    async () => {
      const patientId = `join-paused-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        await service.pauseQueue(ctx.queueId);

        await expect(
          service.joinQueue({ queueId: ctx.queueId, patientId })
        ).rejects.toBeInstanceOf(QueuePausedError);

        const active = await service.getActiveRegistrationsForPatient(patientId);
        expect(active).toEqual([]);
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "resuming a paused queue re-opens joins and persists the status transition",
    { timeout: 60_000 },
    async () => {
      const patientId = `join-resume-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        await service.pauseQueue(ctx.queueId);

        const resumed = await service.resumeQueue(ctx.queueId);
        expect(resumed.status).toBe("ACTIVE");

        // The same queue accepts joins again once resumed.
        const joined = await service.joinQueue({
          queueId: ctx.queueId,
          patientId,
        });
        expect(joined.entry.status).toBe("WAITING");

        const eventTypes = (await service.getQueueEvents(ctx.queueId)).map(
          (e) => e.eventType
        );
        expect(eventTypes).toContain("QUEUE_PAUSED");
        expect(eventTypes).toContain("QUEUE_RESUMED");
        expect(eventTypes.filter((t) => t === "QUEUE_RESUMED")).toHaveLength(1);
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "stats for a joinable queue are calculated from real waiting entries",
    { timeout: 60_000 },
    async () => {
      const patientA = `stats-a-${crypto.randomUUID()}`;
      const patientB = `stats-b-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({
        patientIds: [patientA, patientB],
        averageConsultationMinutes: 7,
      });

      try {
        const service = buildLeanQueueService();
        await service.joinQueue({ queueId: ctx.queueId, patientId: patientA });
        await service.joinQueue({ queueId: ctx.queueId, patientId: patientB });

        const stats = await service.getQueueStats(ctx.queueId);
        expect(stats.totalWaiting).toBe(2);
        expect(stats.estimatedWaitMinutes).toBeGreaterThanOrEqual(14);
      } finally {
        await ctx.cleanup();
      }
    }
  );
});