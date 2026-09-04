import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { getPatientStatus } from "@/features/patients/get-patient-status";
import { getPatientStore } from "@/features/patients/patient-store";

function createService(): QueueService {
  return new QueueService(new MockQueueRepository());
}

describe("getPatientStatus (waiting)", () => {
  it("assembles position, patients ahead, ETA and current serving token", async () => {
    const service = createService();
    // entry-5 is token 22 (WAITING); entry-4 token 21 is IN_CONSULTATION
    const data = await getPatientStatus("entry-5", service);

    expect(data.entryNotFound).toBe(false);
    expect(data.tokenNumber).toBe(22);
    expect(data.entryStatus).toBe("WAITING");
    expect(data.departmentName).toBe("General Medicine");
    expect(data.doctorName).toBe("Dr. Ahmed Khan");
    expect(data.queueStatus).toBe("ACTIVE");
    expect(data.patientsAhead).toBe(0);
    expect(data.position).toBe(1);
    expect(data.currentServingToken).toBe(21);
    expect(data.estimatedWaitMinutes).toBe(0);
  });

  it("reports a waited-on middle patient correctly", async () => {
    const service = createService();
    // entry-7 is token 24 (WAITING); ahead are 22, 23
    const data = await getPatientStatus("entry-7", service);
    expect(data.patientsAhead).toBe(2);
    expect(data.position).toBe(3);
  });

  it("returns entryNotFound for a missing entry", async () => {
    const service = createService();
    const data = await getPatientStatus("missing-entry", service);
    expect(data.entryNotFound).toBe(true);
  });

  it("reflects a paused queue", async () => {
    const service = createService();
    await service.pauseQueue("queue-1");
    const data = await getPatientStatus("entry-5", service);
    expect(data.queueStatus).toBe("PAUSED");
  });
});

describe("getPatientStatus (terminal states)", () => {
  it("reports completed entries", async () => {
    const service = createService();
    const data = await getPatientStatus("entry-1", service);
    expect(data.entryStatus).toBe("COMPLETED");
  });

  it("reports in-consultation entries", async () => {
    const service = createService();
    const data = await getPatientStatus("entry-4", service);
    expect(data.entryStatus).toBe("IN_CONSULTATION");
  });
});

describe("getPatientStatus after a join", () => {
  it("reflects a newly joined patient's status", async () => {
    const service = createService();
    const joined = await service.joinQueue({
      queueId: "queue-1",
      patientId: "patient-1",
    });
    // joined token is 28; ahead are 22-27 (6 patients)
    const data = await getPatientStatus(joined.entry.id, service);
    expect(data.tokenNumber).toBe(28);
    expect(data.entryStatus).toBe("WAITING");
    expect(data.patientsAhead).toBe(6);
    expect(data.position).toBe(7);
    expect(data.estimatedWaitMinutes).toBe(42);
  });
});

describe("patient store registration", () => {
  it("registers a new patient", () => {
    const store = getPatientStore();
    const patient = store.registerPatient({
      name: "Test Patient",
      phone: "+92-333-5555555",
      clinicId: "clinic-1",
    });
    expect(patient.name).toBe("Test Patient");
    expect(patient.clinicId).toBe("clinic-1");
  });

  it("returns an existing patient for the same phone", () => {
    const store = getPatientStore();
    const first = store.registerPatient({
      name: "Duplicate Name",
      phone: "+92-333-7777777",
      clinicId: "clinic-1",
    });
    const second = store.registerPatient({
      name: "Ignored Name",
      phone: "+92-333-7777777",
      clinicId: "clinic-1",
    });
    expect(second.id).toBe(first.id);
    expect(second.name).toBe("Duplicate Name");
  });
});
