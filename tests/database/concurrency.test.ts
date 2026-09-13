import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildLeanQueueService, createIsolatedQueue } from "./test-context";
import { CannotCallNextPatientError, InvalidTransitionError } from "@/lib/queue/errors";

describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_TESTS !== "1"
)("PostgreSQL concurrency protection", () => {
  it("lets exactly one caller claim the next patient", async () => {
    const patients = [randomUUID(), randomUUID(), randomUUID()];
    const queue = await createIsolatedQueue({ patientIds: patients });

    try {
      const setup = buildLeanQueueService();
      for (const patientId of patients) {
        await setup.joinQueue({ queueId: queue.queueId, patientId });
      }

      const callerOne = buildLeanQueueService();
      const callerTwo = buildLeanQueueService();
      const results = await Promise.allSettled([
        callerOne.callNextPatient(queue.queueId),
        callerTwo.callNextPatient(queue.queueId),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        CannotCallNextPatientError
      );

      const entries = await setup.getQueueEntries(queue.queueId);
      const called = entries.filter((e) => e.status === "CALLED");
      expect(called).toHaveLength(1);
      expect(called[0].tokenNumber).toBe(1);

      const events = await setup.getQueueEvents(queue.queueId);
      expect(events.filter((e) => e.eventType === "PATIENT_CALLED")).toHaveLength(1);

      // With the CALLED entry still active, the next caller is refused
      // (CannotCallNext, not NoPatientsWaiting).
      await expect(
        setup.callNextPatient(queue.queueId)
      ).rejects.toBeInstanceOf(CannotCallNextPatientError);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("allocates distinct monotonic tokens to concurrent joins", async () => {
    const patientOne = `join-${randomUUID()}`;
    const patientTwo = `join-${randomUUID()}`;
    const queue = await createIsolatedQueue({
      patientIds: [patientOne, patientTwo],
    });

    try {
      const joinerOne = buildLeanQueueService();
      const joinerTwo = buildLeanQueueService();
      const results = await Promise.allSettled([
        joinerOne.joinQueue({ queueId: queue.queueId, patientId: patientOne }),
        joinerTwo.joinQueue({ queueId: queue.queueId, patientId: patientTwo }),
      ]);

      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const tokens: number[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          tokens.push(result.value.entry.tokenNumber);
        }
      }
      expect(tokens.sort()).toEqual([1, 2]);

      const entries = await joinerOne.getQueueEntries(queue.queueId);
      expect(entries.map((e) => e.tokenNumber).sort()).toEqual([1, 2]);
      expect(entries.every((e) => e.status === "WAITING")).toBe(true);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("serializes competing consultation starts on the same CALLED entry", async () => {
    const patient = `race-${randomUUID()}`;
    const queue = await createIsolatedQueue({ patientIds: [patient] });

    try {
      const setup = buildLeanQueueService();
      const joined = await setup.joinQueue({
        queueId: queue.queueId,
        patientId: patient,
      });
      await setup.callNextPatient(queue.queueId);

      const doctorOne = buildLeanQueueService();
      const doctorTwo = buildLeanQueueService();
      const results = await Promise.allSettled([
        doctorOne.startConsultation(joined.entry.id),
        doctorTwo.startConsultation(joined.entry.id),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        InvalidTransitionError
      );

      const stored = await setup.getQueueEntry(joined.entry.id);
      expect(stored?.status).toBe("IN_CONSULTATION");

      const events = await setup.getQueueEvents(queue.queueId);
      expect(events.filter((e) => e.eventType === "CONSULTATION_STARTED")).toHaveLength(1);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);

  it("serializes a consultation start against a simultaneous no-show on a CALLED entry", async () => {
    const patient = `race-${randomUUID()}`;
    const queue = await createIsolatedQueue({ patientIds: [patient] });

    try {
      const setup = buildLeanQueueService();
      const joined = await setup.joinQueue({
        queueId: queue.queueId,
        patientId: patient,
      });
      await setup.callNextPatient(queue.queueId);

      const doctorOne = buildLeanQueueService();
      const doctorTwo = buildLeanQueueService();
      const results = await Promise.allSettled([
        doctorOne.startConsultation(joined.entry.id),
        doctorTwo.markNoShow(joined.entry.id),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        InvalidTransitionError
      );

      const stored = await setup.getQueueEntry(joined.entry.id);
      expect(["IN_CONSULTATION", "NO_SHOW"]).toContain(stored?.status);

      const events = await setup.getQueueEvents(queue.queueId);
      const winners = events.filter(
        (e) =>
          e.eventType === "CONSULTATION_STARTED" ||
          e.eventType === "PATIENT_NO_SHOW"
      );
      // Exactly one transition won; the other was rolled back with it.
      expect(winners).toHaveLength(1);
    } finally {
      await queue.cleanup();
    }
  }, 30_000);
});