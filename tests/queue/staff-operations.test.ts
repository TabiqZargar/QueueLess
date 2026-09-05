import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import {
  CannotCallNextPatientError,
  QueueNotFoundError,
  QueuePausedError,
} from "@/lib/queue/errors";

function createService(): QueueService {
  return new QueueService(new MockQueueRepository());
}

describe("staff operations - full patient flow", () => {
  it("calls, starts and completes the same patient", async () => {
    const service = createService();
    // Clear the seeded IN_CONSULTATION patient first
    await service.completeConsultation("entry-4");

    const called = await service.callNextPatient("queue-1");
    expect(called.status).toBe("CALLED");
    expect(called.tokenNumber).toBe(22);

    const started = await service.startConsultation(called.id);
    expect(started.status).toBe("IN_CONSULTATION");
    expect(started.consultationStartedAt).toBeTruthy();

    const completed = await service.completeConsultation(called.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeTruthy();
  });
});

describe("call-next concurrency business rule", () => {
  it("rejects calling next while a patient is already IN_CONSULTATION", async () => {
    const service = createService();
    await expect(service.callNextPatient("queue-1")).rejects.toBeInstanceOf(
      CannotCallNextPatientError
    );
  });

  it("rejects calling next while a patient is already CALLED", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    await service.callNextPatient("queue-1");
    await expect(service.callNextPatient("queue-1")).rejects.toBeInstanceOf(
      CannotCallNextPatientError
    );
  });

  it("allows calling next after the current patient is completed", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    const called = await service.callNextPatient("queue-1");
    expect(called.tokenNumber).toBe(22);
  });

  it("rejects calling next when the queue is paused", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    await expect(service.callNextPatient("queue-1")).rejects.toBeInstanceOf(
      QueuePausedError
    );
  });

  it("rejects operations against a missing queue", async () => {
    const service = createService();
    await expect(service.getWaitList("missing")).rejects.toBeInstanceOf(
      QueueNotFoundError
    );
    await expect(
      service.getCurrentActiveEntry("missing")
    ).rejects.toBeInstanceOf(QueueNotFoundError);
    await expect(service.getQueueStatusCounts("missing")).rejects.toBeInstanceOf(
      QueueNotFoundError
    );
  });
});

describe("staff data reads", () => {
  it("reports status counts for the seeded queue", async () => {
    const service = createService();
    const counts = await service.getQueueStatusCounts("queue-1");
    expect(counts).toEqual({
      waiting: 6,
      called: 0,
      inConsultation: 1,
      completed: 3,
      noShow: 0,
      cancelled: 0,
    });
  });

  it("returns the active in-consultation patient", async () => {
    const service = createService();
    const current = await service.getCurrentActiveEntry("queue-1");
    expect(current?.tokenNumber).toBe(21);
    expect(current?.status).toBe("IN_CONSULTATION");
    expect(current?.patientName).toBe("Muhammad Hassan");
  });

  it("returns null when no patient is currently called/consulting", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    expect(await service.getCurrentActiveEntry("queue-1")).toBeNull();
  });

  it("returns the waiting list in token order with position and ETA", async () => {
    const service = createService();
    const list = await service.getWaitList("queue-1");

    expect(list.map((e) => e.tokenNumber)).toEqual([22, 23, 24, 25, 26, 27]);
    expect(list[0].patientName).toBe("Ayesha Siddiqui");
    expect(list[0].position).toBe(1);
    expect(list[0].patientsAhead).toBe(0);
    expect(list[1].position).toBe(2);
    expect(list[1].estimatedWaitMinutes).toBe(7);
    expect(list[0].entryType).toBe("APPOINTMENT");
  });

  it("tracks no-show and cancelled entries in the counts", async () => {
    const service = createService();
    await service.markNoShow("entry-5");
    await service.cancelQueueEntry("entry-6");

    const counts = await service.getQueueStatusCounts("queue-1");
    expect(counts.waiting).toBe(4);
    expect(counts.noShow).toBe(1);
    expect(counts.cancelled).toBe(1);
  });
});