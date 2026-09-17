import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import { NON_TERMINAL_ENTRY_STATUSES } from "@/lib/queue/repository";
import {
  getActiveRegistrationsForUser,
  getCurrentPatientRegistration,
  patientStatusPath,
} from "@/features/patients/active-registration";

function createService(): QueueService {
  return new QueueService(new MockQueueRepository());
}

describe("getActiveRegistrationsForPatient (mock)", () => {
  // patient-1 owns entry-1 (COMPLETED), entry-4 (IN_CONSULTATION),
  // entry-7 (WAITING), entry-10 (WAITING)
  it("returns only non-terminal entries, newest first", async () => {
    const service = createService();
    const active = await service.getActiveRegistrationsForPatient("patient-1");

    expect(active.map((e) => e.id)).toEqual([
      "entry-10",
      "entry-7",
      "entry-4",
    ]);
    expect(
      active.every((e) => NON_TERMINAL_ENTRY_STATUSES.includes(e.status))
    ).toBe(true);
    expect(active.some((e) => e.status === "COMPLETED")).toBe(false);
  });

  it("scopes active registrations to the owning patient", async () => {
    const service = createService();
    const forPatient2 = await service.getActiveRegistrationsForPatient(
      "patient-2"
    );

    expect(forPatient2.map((e) => e.id)).toEqual(["entry-8", "entry-5"]);
    expect(forPatient2.some((e) => e.patientId !== "patient-2")).toBe(false);
  });

  it("returns an empty list when the patient has no active journey", async () => {
    const service = createService();
    const active = await service.getActiveRegistrationsForPatient("nobody");
    expect(active).toEqual([]);
  });
});

describe("patient active-registration helper", () => {
  it("requires the Prisma-backed repository to expose active-registration queries", () => {
    expect(typeof PrismaQueueRepository.prototype.getActiveEntriesForPatient).toBe("function");
  });

  it("resolves the most recent active registration to a status path", async () => {
    const service = createService();
    const current = await getCurrentPatientRegistration("patient-1", service);

    expect(current?.id).toBe("entry-10");
    expect(current?.queueId).toBe("queue-1");
    expect(patientStatusPath(current)).toBe("/queue/queue-1/status");
  });

  it("returns null (no redirect) when there is no active registration", async () => {
    const service = createService();
    const current = await getCurrentPatientRegistration("nobody", service);

    expect(current).toBeNull();
    expect(patientStatusPath(current)).toBeNull();
  });
});