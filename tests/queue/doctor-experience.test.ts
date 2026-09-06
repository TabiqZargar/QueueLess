import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { getDoctorDashboardData } from "@/features/doctor/get-doctor-data";
import { InvalidTransitionError } from "@/lib/queue/errors";

function createService(): QueueService {
  return new QueueService(new MockQueueRepository());
}

describe("doctor experience - consultation workflow", () => {
  it("starts a consultation for a CALLED patient and reports IN_CONSULTATION", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    const called = await service.callNextPatient("queue-1");
    expect(called.status).toBe("CALLED");

    const started = await service.startConsultation(called.id);
    expect(started.status).toBe("IN_CONSULTATION");
    expect(started.consultationStartedAt).toBeInstanceOf(Date);
  });

  it("completes the consultation and clears the current patient", async () => {
    const service = createService();
    const completed = await service.completeConsultation("entry-4");
    expect(completed.status).toBe("COMPLETED");

    const data = await getDoctorDashboardData("queue-1", service);
    expect(data?.currentPatient).toBeNull();
    expect(data?.counts.completed).toBe(4);
    expect(data?.counts.inConsultation).toBe(0);
  });

  it("surfaces CALLED then IN_CONSULTATION through the doctor view model", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    await service.callNextPatient("queue-1");

    const calledData = await getDoctorDashboardData("queue-1", service);
    expect(calledData?.currentPatient?.tokenNumber).toBe(22);
    expect(calledData?.currentPatient?.status).toBe("CALLED");
    expect(calledData?.currentPatient?.calledAt).toBeInstanceOf(Date);

    await service.startConsultation("entry-5");
    const consulting = await getDoctorDashboardData("queue-1", service);
    expect(consulting?.currentPatient?.status).toBe("IN_CONSULTATION");
    expect(consulting?.currentPatient?.consultationStartedAt).toBeInstanceOf(
      Date
    );
    expect(consulting?.counts.inConsultation).toBe(1);
  });

  it("rejects starting a consultation from WAITING", async () => {
    const service = createService();
    await expect(service.startConsultation("entry-5")).rejects.toThrow(
      InvalidTransitionError
    );
  });

  it("rejects completing a consultation from CALLED", async () => {
    const service = createService();
    await service.completeConsultation("entry-4");
    await service.callNextPatient("queue-1");
    await expect(service.completeConsultation("entry-5")).rejects.toThrow(
      InvalidTransitionError
    );
  });

  it("does not bypass QueueService: an active consultation prevents a second one", async () => {
    const service = createService();
    const data = await getDoctorDashboardData("queue-1", service);
    expect(data?.currentPatient?.entryId).toBe("entry-4");
    expect(data?.counts.inConsultation).toBe(1);

    await expect(service.startConsultation("entry-5")).rejects.toThrow(
      InvalidTransitionError
    );
  });

  it("keeps the dashboard usable while the queue is paused", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");

    const data = await getDoctorDashboardData("queue-1", service);
    expect(data).not.toBeNull();
    expect(data?.queueStatus).toBe("PAUSED");
    expect(data?.currentPatient?.entryId).toBe("entry-4");

    const completed = await service.completeConsultation("entry-4");
    expect(completed.status).toBe("COMPLETED");
  });

  it("reports no current patient for an empty queue", async () => {
    const service = createService();
    const data = await getDoctorDashboardData("queue-2", service);
    expect(data?.currentPatient).toBeNull();
    expect(data?.upcoming).toEqual([]);
    expect(data?.counts.waiting).toBe(0);
  });

  it("returns null when the queue does not exist", async () => {
    const service = createService();
    await expect(
      getDoctorDashboardData("missing-queue", service)
    ).resolves.toBeNull();
  });

  it("lists upcoming patients with position and ETA from the service layer", async () => {
    const service = createService();
    const data = await getDoctorDashboardData("queue-1", service);
    expect(data?.upcoming.map((e) => e.tokenNumber)).toEqual([
      22, 23, 24, 25, 26, 27,
    ]);
    expect(data?.upcoming[0]).toMatchObject({
      position: 1,
      estimatedWaitMinutes: 0,
    });
    expect(data?.upcoming[1]).toMatchObject({
      position: 2,
      estimatedWaitMinutes: 7,
    });
  });

  it("resolves the doctor identity from hydrated queue details", async () => {
    const service = createService();
    const data = await getDoctorDashboardData("queue-1", service);
    expect(data?.identity).toMatchObject({
      name: "Dr. Ahmed Khan",
      department: "General Medicine",
      clinic: "City Health Clinic",
      queueId: "queue-1",
    });
  });
});