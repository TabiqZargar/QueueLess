import { describe, expect, it } from "vitest";
import { db } from "../../prisma/db";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import { getStaffDashboardData } from "@/features/staff/get-staff-data";
import { getDoctorDashboardData } from "@/features/doctor/get-doctor-data";
import {
  createIsolatedQueue,
  buildLeanQueueService,
  TestQueueContext,
} from "./test-context";

/**
 * Regression coverage for patient-information propagation.
 *
 * Patients registered through the join / walk-in flows must be persisted to
 * PostgreSQL at the moment of registration, otherwise the entry insert fails a
 * foreign-key check (new patient id) or the staff/doctor read models fall back
 * to "Unknown patient" (stale/absent patient row). These tests drive the exact
 * repository -> service -> read-model path the dashboards use.
 */

/**
 * Deletes a patient row created through upsertPatient together with everything
 * that references it, then runs the isolated-queue cleanup. Ordering follows
 * the FK chain (realtime/notification/domain events -> entries -> patient ->
 * queue -> doctor/department/clinic); `createIsolatedQueue`'s cleanup only
 * removes patients it seeded itself, so freshly registered rows are handled
 * here first.
 */
async function cleanupWithPatient(
  ctx: TestQueueContext,
  patientId: string
): Promise<void> {
  await db.orm.public.QueueRealtimeEvent.where({ queueId: ctx.queueId }).deleteAll();
  await db.orm.public.Notification.where({ queueId: ctx.queueId }).deleteAll();
  await db.orm.public.QueueEvent.where({ queueId: ctx.queueId }).deleteAll();
  await db.orm.public.QueueEntry.where({ queueId: ctx.queueId }).deleteAll();
  await db.orm.public.Patient.where({ id: patientId }).delete();
  await ctx.cleanup();
}

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("patient registration persistence (database)", () => {
  it(
    "registers a new patient into PostgreSQL and resolves it from a fresh repository instance",
    { timeout: 60_000 },
    async () => {
      const patientId = `fresh-patient-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue();

      try {
        const service = buildLeanQueueService();
        const registered = await service.upsertPatient({
          id: patientId,
          name: "Zahid Mehmood",
          phone: "+92-333-1112222",
          clinicId: ctx.clinicId,
        });

        expect(registered.id).toBe(patientId);
        expect(registered.name).toBe("Zahid Mehmood");
        expect(registered.phone).toBe("+92-333-1112222");

        // A brand-new repository (fresh request / another process) sees it.
        const reader = new PrismaQueueRepository();
        const reloaded = await reader.getPatient(patientId);
        expect(reloaded?.name).toBe("Zahid Mehmood");
        expect(reloaded?.phone).toBe("+92-333-1112222");
        expect(reloaded?.clinicId).toBe(ctx.clinicId);
      } finally {
        await cleanupWithPatient(ctx, patientId);
      }
    }
  );

  it(
    "updates the registered information on an existing patient record",
    { timeout: 60_000 },
    async () => {
      const patientId = `update-patient-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue({ patientIds: [patientId] });

      try {
        const service = buildLeanQueueService();
        await service.upsertPatient({
          id: patientId,
          name: "Before Registration",
          phone: "+92-300-0000000",
          clinicId: ctx.clinicId,
        });

        // The join flow re-registers the same patient (same id) with the
        // details they actually entered, which must replace the stale values.
        await service.upsertPatient({
          id: patientId,
          name: "After Registration",
          phone: "+92-321-9999999",
          clinicId: ctx.clinicId,
        });

        const reloaded = new PrismaQueueRepository();
        const patient = await reloaded.getPatient(patientId);
        expect(patient?.name).toBe("After Registration");
        expect(patient?.phone).toBe("+92-321-9999999");
      } finally {
        await cleanupWithPatient(ctx, patientId);
      }
    }
  );

  it(
    "a registered patient appears on the staff wait list with their registered name",
    { timeout: 60_000 },
    async () => {
      const patientId = `waitlist-patient-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue();

      try {
        const service = buildLeanQueueService();
        await service.upsertPatient({
          id: patientId,
          name: "Nusrat Batool",
          phone: "+92-322-5550000",
          clinicId: ctx.clinicId,
        });
        await service.joinQueue({ queueId: ctx.queueId, patientId });

        const data = await getStaffDashboardData(ctx.queueId, service);
        expect(data?.waitList).toHaveLength(1);
        expect(data?.waitList[0].patientName).toBe("Nusrat Batool");
        expect(data?.waitList[0].tokenNumber).toBe(1);
      } finally {
        await cleanupWithPatient(ctx, patientId);
      }
    }
  );

  it(
    "a walk-in patient appears on the staff wait list with their registered information",
    { timeout: 60_000 },
    async () => {
      const walkInId = `walkin-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue();

      try {
        const service = buildLeanQueueService();
        await service.upsertPatient({
          id: walkInId,
          name: "Walk-in Patient",
          phone: "+92-345-0001111",
          clinicId: ctx.clinicId,
        });
        await service.joinQueue({
          queueId: ctx.queueId,
          patientId: walkInId,
          entryType: "WALK_IN",
        });

        const data = await getStaffDashboardData(ctx.queueId, service);
        expect(data?.waitList[0].patientName).toBe("Walk-in Patient");
        expect(data?.waitList[0].entryType).toBe("WALK_IN");
      } finally {
        await cleanupWithPatient(ctx, walkInId);
      }
    }
  );

  it(
    "the called patient's name appears on the staff and doctor dashboards",
    { timeout: 60_000 },
    async () => {
      const patientId = `current-patient-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue();

      try {
        const service = buildLeanQueueService();
        await service.upsertPatient({
          id: patientId,
          name: "Sana Tariq",
          phone: "+92-346-2223333",
          clinicId: ctx.clinicId,
        });
        await service.joinQueue({ queueId: ctx.queueId, patientId });
        await service.callNextPatient(ctx.queueId);

        const staff = await getStaffDashboardData(ctx.queueId, service);
        expect(staff?.currentPatient?.patientName).toBe("Sana Tariq");
        expect(staff?.currentPatient?.tokenNumber).toBe(1);

        const doctor = await getDoctorDashboardData(ctx.queueId, service);
        expect(doctor?.currentPatient?.patientName).toBe("Sana Tariq");
        expect(doctor?.currentPatient?.tokenNumber).toBe(1);
      } finally {
        await cleanupWithPatient(ctx, patientId);
      }
    }
  );

  it(
    "the queue entry references the persisted patient id (foreign key holds)",
    { timeout: 60_000 },
    async () => {
      const patientId = `entry-owner-${crypto.randomUUID()}`;
      const ctx = await createIsolatedQueue();

      try {
        const service = buildLeanQueueService();
        await service.upsertPatient({
          id: patientId,
          name: "Owner Check",
          phone: "+92-347-4445555",
          clinicId: ctx.clinicId,
        });

        const joined = await service.joinQueue({ queueId: ctx.queueId, patientId });

        const repository = new PrismaQueueRepository();
        const entry = await repository.getQueueEntry(joined.entry.id);
        const patient = await repository.getPatient(patientId);
        expect(entry?.patientId).toBe(patientId);
        expect(patient?.id).toBe(patientId);

        const active = await service.getActiveRegistrationsForPatient(patientId);
        expect(active.map((e) => e.id)).toContain(joined.entry.id);
      } finally {
        await cleanupWithPatient(ctx, patientId);
      }
    }
  );
});