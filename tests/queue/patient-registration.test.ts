import { describe, expect, it } from "vitest";
import { QueueService } from "@/lib/queue/queue-service";
import { MockQueueRepository } from "@/lib/queue/mock-repository";
import { getStaffDashboardData } from "@/features/staff/get-staff-data";

function createService(): QueueService {
  return new QueueService(new MockQueueRepository());
}

describe("patient registration propagation (mock repository)", () => {
  it("a newly registered patient's name appears on the staff wait list", async () => {
    const service = createService();

    await service.upsertPatient({
      id: "patient-reg-1",
      name: "Registered Patient",
      phone: "+92-333-8880000",
      clinicId: "clinic-1",
    });
    await service.joinQueue({ queueId: "queue-1", patientId: "patient-reg-1" });

    const data = await getStaffDashboardData("queue-1", service);
    expect(
      data?.waitList.some((e) => e.patientName === "Registered Patient")
    ).toBe(true);
  });

  it("upsert updates the registered name on an existing patient", async () => {
    const service = createService();

    await service.upsertPatient({
      id: "patient-1",
      name: "Updated Name",
      phone: "+92-300-1234567",
      clinicId: "clinic-1",
    });

    const data = await getStaffDashboardData("queue-1", service);
    // entry-7 (token 24) belongs to patient-1.
    expect(data?.waitList.find((e) => e.tokenNumber === 24)?.patientName).toBe(
      "Updated Name"
    );
  });

  it("join resolves the patient id to the registered patient (ownership holds)", async () => {
    const service = createService();

    await service.upsertPatient({
      id: "patient-owner-1",
      name: "Owner",
      phone: "+92-333-1239876",
      clinicId: "clinic-1",
    });
    const joined = await service.joinQueue({
      queueId: "queue-1",
      patientId: "patient-owner-1",
    });
    expect(joined.entry.patientId).toBe("patient-owner-1");
  });
});