import { describe, expect, it } from "vitest";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import { getPatientStatus } from "@/features/patients/get-patient-status";
import {
  createIsolatedQueue,
  buildLeanQueueService,
} from "./test-context";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("patient dashboard persistence (database)", () => {
  it(
    "enriches queue details with the persisted doctor, department and clinic",
    { timeout: 60_000 },
    async () => {
      const ctx = await createIsolatedQueue({
        existingPatientIds: ["patient-1"],
      });

      try {
        const repository = new PrismaQueueRepository();
        const details = await repository.getQueueWithDetails(ctx.queueId);

        expect(details?.doctor?.displayName).toBe("QueueLess Test Doctor");
        expect(details?.departmentName).toBe("QueueLess Test Department");
        expect(details?.clinicName).toBe("QueueLess Test Clinic");

        const listed = await repository.listQueues();
        const listedQueue = listed.find((q) => q.id === ctx.queueId);
        expect(listedQueue?.doctor?.displayName).toBe("QueueLess Test Doctor");
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "reaches the patient status view model with the persisted doctor name",
    { timeout: 60_000 },
    async () => {
      const entryId = `entry-status-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({
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
        const service = buildLeanQueueService();
        const data = await getPatientStatus(entryId, service);

        expect(data.entryNotFound).toBe(false);
        expect(data.doctorName).toBe("QueueLess Test Doctor");
        expect(data.departmentName).toBe("QueueLess Test Department");
        expect(data.clinicName).toBe("QueueLess Test Clinic");
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "recovers a joined patient's active registration through a fresh repository",
    { timeout: 60_000 },
    async () => {
      const patientId = `recovery-patient-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const firstService = buildLeanQueueService();
        const joined = await firstService.joinQueue({
          queueId: ctx.queueId,
          patientId,
        });
        expect(joined.entry.status).toBe("WAITING");

        // A fresh repository + service instance (new request / browser session)
        // must recover the same persistent registration from the database.
        const secondService = buildLeanQueueService();
        const recovered =
          await secondService.getActiveRegistrationsForPatient(patientId);

        expect(recovered).toHaveLength(1);
        expect(recovered[0].id).toBe(joined.entry.id);
        expect(recovered[0].queueId).toBe(ctx.queueId);
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "scopes active registrations to the owning patient",
    { timeout: 60_000 },
    async () => {
      const patientA = `scope-a-${crypto.randomUUID()}`;
      const patientB = `scope-b-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({
        patientIds: [patientA, patientB],
      });

      try {
        const service = buildLeanQueueService();
        await service.joinQueue({ queueId: ctx.queueId, patientId: patientA });

        const forA = await service.getActiveRegistrationsForPatient(patientA);
        const forB = await service.getActiveRegistrationsForPatient(patientB);

        expect(forA).toHaveLength(1);
        expect(forA[0].patientId).toBe(patientA);
        expect(forB).toEqual([]);
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "excludes terminal entries from active registrations",
    { timeout: 60_000 },
    async () => {
      const patientId = `terminal-patient-${crypto.randomUUID()}`;
      const terminalId = `entry-terminal-${crypto.randomUUID()}`;
      const activeId = `entry-active-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({
        patientIds: [patientId],
        entries: [
          {
            id: terminalId,
            patientId,
            tokenNumber: 1,
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
          },
          {
            id: activeId,
            patientId,
            tokenNumber: 2,
            status: "WAITING",
          },
        ],
      });

      try {
        const service = buildLeanQueueService();
        const active = await service.getActiveRegistrationsForPatient(patientId);

        expect(active.map((e) => e.id)).toEqual([activeId]);
      } finally {
        await ctx.cleanup();
      }
    }
  );

  it(
    "returns the most recently joined active registration first",
    { timeout: 60_000 },
    async () => {
      const patientId = `ordering-patient-${crypto.randomUUID()}`;
      const olderId = `entry-older-${crypto.randomUUID()}`;
      const newerId = `entry-newer-${crypto.randomUUID()}`;
      const older = new Date("2024-01-20T08:00:00.000Z");
      const newer = new Date("2024-01-20T09:00:00.000Z");
      const ctx = await createIsolatedQueue({
        patientIds: [patientId],
        entries: [
          {
            id: olderId,
            patientId,
            tokenNumber: 1,
            status: "WAITING",
            joinedAt: older.toISOString(),
          },
          {
            id: newerId,
            patientId,
            tokenNumber: 2,
            status: "WAITING",
            joinedAt: newer.toISOString(),
          },
        ],
      });

      try {
        const service = buildLeanQueueService();
        const active = await service.getActiveRegistrationsForPatient(patientId);

        expect(active.map((e) => e.id)).toEqual([newerId, olderId]);
      } finally {
        await ctx.cleanup();
      }
    }
  );
});