import { beforeEach, describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import {
  QueueEntryNotFoundError,
  QueueNotFoundError,
  QueuePausedError,
  InvalidTransitionError,
  NoPatientsWaitingError,
} from "@/lib/queue/errors";

function createService(): QueueService {
  return new QueueService(new MockQueueRepository());
}

describe("QueueService.getQueue", () => {
  it("returns queue details for existing queue", async () => {
    const service = createService();
    const queue = await service.getQueue("queue-1");
    expect(queue).not.toBeNull();
    expect(queue?.doctor?.displayName).toBe("Dr. Ahmed Khan");
    expect(queue?.departmentName).toBe("General Medicine");
  });

  it("returns null for non-existent queue", async () => {
    const service = createService();
    expect(await service.getQueue("missing")).toBeNull();
  });
});

describe("QueueService.joinQueue", () => {
  it("joins an active queue and assigns next token", async () => {
    const service = createService();
    const result = await service.joinQueue({
      queueId: "queue-1",
      patientId: "patient-1",
    });

    expect(result.entry.tokenNumber).toBe(28);
    expect(result.entry.status).toBe("WAITING");
    expect(result.entry.queueId).toBe("queue-1");
    expect(result.entry.patientId).toBe("patient-1");
    expect(result.entry.entryType).toBe("APPOINTMENT");
  });

  it("computes position and estimated wait on join", async () => {
    const service = createService();
    const result = await service.joinQueue({
      queueId: "queue-1",
      patientId: "patient-1",
    });

    // queue-1 has 22,23,24,25,26,27 waiting plus this new 28
    // patients ahead = 6, waiting count before join = 6
    expect(result.position).toBe(7);
    expect(result.estimatedWaitMinutes).toBe(42);
  });

  it("rejects joining a paused queue", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    await expect(
      service.joinQueue({ queueId: "queue-1", patientId: "patient-1" })
    ).rejects.toBeInstanceOf(QueuePausedError);
  });

  it("rejects joining a closed/non-active queue", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    await expect(
      service.joinQueue({ queueId: "queue-1", patientId: "patient-1" })
    ).rejects.toBeInstanceOf(QueuePausedError);
  });

  it("rejects joining a non-existent queue", async () => {
    const service = createService();
    await expect(
      service.joinQueue({ queueId: "missing", patientId: "patient-1" })
    ).rejects.toBeInstanceOf(QueueNotFoundError);
  });
});

describe("QueueService.getQueuePosition", () => {
  it("computes position for an existing waiting entry", async () => {
    const service = createService();
    const pos = await service.getQueuePosition("entry-10");
    // entry-10 is token 27; waiting ahead: 22,23,24,25,26 => 5 ahead, position 6
    expect(pos.patientsAhead).toBe(5);
    expect(pos.position).toBe(6);
  });

  it("throws for non-existent entry", async () => {
    const service = createService();
    await expect(service.getQueuePosition("missing")).rejects.toBeInstanceOf(
      QueueEntryNotFoundError
    );
  });
});

describe("QueueService.callNextPatient", () => {
  it("calls the earliest waiting patient", async () => {
    const service = createService();
    // Complete current consultation entry-4 (token 21) first
    await service.completeConsultation("entry-4");
    const called = await service.callNextPatient("queue-1");
    expect(called.status).toBe("CALLED");
    expect(called.tokenNumber).toBe(22);
    expect(called.calledAt).toBeTruthy();
  });

  it("rejects when no patients are waiting", async () => {
    const service = createService();
    // Complete current consultation
    await service.completeConsultation("entry-4");
    // Simulate a queue with no waiting patients by using queue-2 (no entries)
    await expect(service.callNextPatient("queue-2")).rejects.toBeInstanceOf(
      NoPatientsWaitingError
    );
  });

  it("rejects calling next while a patient is already called/consulting", async () => {
    const service = createService();
    await expect(service.callNextPatient("queue-1")).rejects.toThrow(
      "already a patient in consultation"
    );
  });

  it("rejects calling next on a paused queue", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    await expect(service.callNextPatient("queue-1")).rejects.toBeInstanceOf(
      QueuePausedError
    );
  });
});

describe("QueueService.startConsultation", () => {
  it("transitions CALLED -> IN_CONSULTATION", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    const called = await service.callNextPatient("queue-1");
    const started = await service.startConsultation(called.id);
    expect(started.status).toBe("IN_CONSULTATION");
    expect(started.consultationStartedAt).toBeTruthy();
  });

  it("rejects starting consultation for a waiting entry", async () => {
    const service = createService();
    await expect(service.startConsultation("entry-5")).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
  });

  it("rejects starting consultation for a completed entry", async () => {
    const service = createService();
    await expect(service.startConsultation("entry-1")).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
  });
});

describe("QueueService.completeConsultation", () => {
  it("transitions IN_CONSULTATION -> COMPLETED", async () => {
    const service = createService();
    const completed = await service.completeConsultation("entry-4");
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeTruthy();
  });

  it("rejects completing a waiting entry", async () => {
    const service = createService();
    await expect(
      service.completeConsultation("entry-5")
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});

describe("QueueService.markNoShow", () => {
  it("transitions CALLED -> NO_SHOW", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    const called = await service.callNextPatient("queue-1");
    const noShow = await service.markNoShow(called.id);
    expect(noShow.status).toBe("NO_SHOW");
  });

  it("transitions WAITING -> NO_SHOW", async () => {
    const service = createService();
    const noShow = await service.markNoShow("entry-5");
    expect(noShow.status).toBe("NO_SHOW");
  });

  it("rejects marking a completed entry as no-show", async () => {
    const service = createService();
    await expect(service.markNoShow("entry-1")).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
  });
});

describe("QueueService.cancelQueueEntry", () => {
  it("cancels a waiting entry", async () => {
    const service = createService();
    const cancelled = await service.cancelQueueEntry("entry-5");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).toBeTruthy();
  });

  it("rejects cancelling a completed entry", async () => {
    const service = createService();
    await expect(
      service.cancelQueueEntry("entry-1")
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects cancelling an in-consultation entry", async () => {
    const service = createService();
    await expect(
      service.cancelQueueEntry("entry-4")
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});

describe("QueueService.pauseQueue / resumeQueue", () => {
  it("pauses an active queue", async () => {
    const service = createService();
    const queue = await service.pauseQueue("queue-1");
    expect(queue.status).toBe("PAUSED");
    expect(queue.pausedAt).toBeTruthy();
  });

  it("resumes a paused queue", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    const queue = await service.resumeQueue("queue-1");
    expect(queue.status).toBe("ACTIVE");
  });

  it("rejects resuming an already-active queue", async () => {
    const service = createService();
    await expect(service.resumeQueue("queue-1")).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
  });

  it("rejects pausing a paused queue", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    await expect(service.pauseQueue("queue-1")).rejects.toBeInstanceOf(
      InvalidTransitionError
    );
  });
});

describe("QueueService.getQueueStats", () => {
  it("returns queue statistics", async () => {
    const service = createService();
    const stats = await service.getQueueStats("queue-1");
    expect(stats.totalWaiting).toBe(6);
    expect(stats.averageConsultationMinutes).toBe(7);
    expect(stats.estimatedWaitMinutes).toBe(42);
    expect(stats.currentToken).toBe(21);
  });

  it("throws for non-existent queue", async () => {
    const service = createService();
    await expect(service.getQueueStats("missing")).rejects.toBeInstanceOf(
      QueueNotFoundError
    );
  });
});

describe("QueueService.addWalkIn", () => {
  it("adds a walk-in at end of queue", async () => {
    const service = createService();
    const result = await service.addWalkIn({
      queueId: "queue-1",
      patientId: "patient-2",
    });
    expect(result.entry.entryType).toBe("WALK_IN");
    expect(result.entry.tokenNumber).toBe(28);
    expect(result.entry.status).toBe("WAITING");
  });
});
