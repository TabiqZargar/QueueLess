import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/types";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { canSubscribeToQueue } from "@/lib/realtime/authorization";

function user(id: string, name: string, role: AuthUser["role"]): AuthUser {
  return { id, name, role };
}

function realDeps() {
  const repository = new MockQueueRepository();
  return {
    getQueueWithDetails: (queueId: string) =>
      repository.getQueueWithDetails(queueId),
    getQueueEntries: (queueId: string) => repository.getQueueEntries(queueId),
  };
}

const staff = user("user-staff", "Staff Operator", "STAFF");
const admin = user("user-admin", "System Administrator", "ADMIN");
const doctor = user("user-doctor", "Dr. Ahmed Khan", "DOCTOR");
const patient = user("patient-1", "Muhammad Hassan", "PATIENT");

describe("canSubscribeToQueue", () => {
  it("allows STAFF and ADMIN on any queue", async () => {
    const deps = realDeps();
    expect(await canSubscribeToQueue(staff, "queue-1", deps)).toBe(true);
    expect(await canSubscribeToQueue(staff, "queue-2", deps)).toBe(true);
    expect(await canSubscribeToQueue(admin, "queue-1", deps)).toBe(true);
    expect(await canSubscribeToQueue(admin, "does-not-exist", deps)).toBe(true);
  });

  it("allows a DOCTOR only on queues they serve", async () => {
    const deps = realDeps();
    // queue-1 -> doc-1 "Dr. Ahmed Khan"; queue-2 -> doc-2 "Dr. Fatima Ali"
    expect(await canSubscribeToQueue(doctor, "queue-1", deps)).toBe(true);
    expect(await canSubscribeToQueue(doctor, "queue-2", deps)).toBe(false);
  });

  it("denies a DOCTOR on a queue that does not exist", async () => {
    expect(await canSubscribeToQueue(doctor, "missing", realDeps())).toBe(false);
  });

  it("allows a PATIENT with an active entry in the queue", async () => {
    // patient-1 has entry-4 (IN_CONSULTATION) and WAITING entries in queue-1
    expect(await canSubscribeToQueue(patient, "queue-1", realDeps())).toBe(true);
  });

  it("denies a PATIENT with no entries in the queue", async () => {
    // patient-1 has no entries in queue-2
    expect(await canSubscribeToQueue(patient, "queue-2", realDeps())).toBe(false);
  });

  it("denies a PATIENT whose entries in the queue are all terminal", async () => {
    const deps = {
      getQueueWithDetails: async () => null,
      getQueueEntries: async () => [
        {
          id: "entry-old",
          queueId: "queue-x",
          patientId: "patient-1",
          tokenNumber: 1,
          entryType: "APPOINTMENT" as const,
          status: "COMPLETED" as const,
          joinedAt: new Date(),
          completedAt: new Date(),
        },
      ],
    };

    expect(await canSubscribeToQueue(patient, "queue-x", deps)).toBe(false);
  });

  it("denies unknown roles", async () => {
    const deps = realDeps();
    const guest = user("user-guest", "Guest", "PATIENT" as AuthUser["role"]);
    // Swap role to a non-role value at runtime to exercise the fallback.
    expect(
      await canSubscribeToQueue({ ...guest, role: "GUEST" as never }, "queue-1", deps)
    ).toBe(false);
  });
});