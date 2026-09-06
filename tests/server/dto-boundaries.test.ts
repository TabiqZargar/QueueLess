import { beforeEach, describe, expect, it, vi } from "vitest";

type DoctorDataModule = typeof import("@/features/doctor/get-doctor-data");
type StaffDataModule = typeof import("@/features/staff/get-staff-data");
type PatientStatusModule = typeof import("@/features/patients/get-patient-status");

let doctor: DoctorDataModule;
let staff: StaffDataModule;
let patientStatus: PatientStatusModule;

beforeEach(async () => {
  vi.resetModules();
  doctor = await import("@/features/doctor/get-doctor-data");
  staff = await import("@/features/staff/get-staff-data");
  patientStatus = await import("@/features/patients/get-patient-status");
});

describe("doctor dashboard DTO boundary", () => {
  it("keeps repository/service internals out of upcoming entries", async () => {
    const data = await doctor.getDoctorDashboardData("queue-1");
    expect(data).not.toBeNull();
    expect(data!.upcoming.length).toBeGreaterThan(0);

    const first = data!.upcoming[0];
    const keys = Object.keys(first).sort();
    expect(keys).toEqual(
      [
        "entryId",
        "entryType",
        "estimatedWaitMinutes",
        "position",
        "tokenNumber",
      ].sort()
    );

    expect(first).not.toHaveProperty("patientId");
    expect(first).not.toHaveProperty("queueId");
    expect(first).not.toHaveProperty("joinedAt");
    expect(first).not.toHaveProperty("patientName");
  });

  it("does not expose patient ids or contact details to the doctor UI", async () => {
    const data = await doctor.getDoctorDashboardData("queue-1");
    expect(data!.currentPatient).not.toBeNull();
    expect(Object.keys(data!.currentPatient!)).not.toContain("patientId");

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("+92-300-1234567");
    expect(serialized).not.toContain("+92-321-7654321");
    expect(serialized).not.toContain("patientId");
  });

  it("still exposes the queue identity the doctor header needs", async () => {
    const data = await doctor.getDoctorDashboardData("queue-1");
    expect(data!.identity.queueId).toBe("queue-1");
    expect(data!.identity.name).toBe("Dr. Ahmed Khan");
    expect(data!.currentPatient!.patientName).toBe("Muhammad Hassan");
  });
});

describe("staff dashboard DTO boundary", () => {
  it("returns staff view models with only operational fields", async () => {
    const data = await staff.getStaffDashboardData("queue-1");
    expect(data).not.toBeNull();

    const waitListKeys = Object.keys(data!.waitList[0]).sort();
    expect(waitListKeys).toEqual(
      [
        "entryId",
        "entryType",
        "estimatedWaitMinutes",
        "patientName",
        "position",
        "tokenNumber",
      ].sort()
    );

    const currentPatientKeys = Object.keys(data!.currentPatient!).sort();
    expect(currentPatientKeys).toEqual(
      ["entryId", "entryType", "patientName", "status", "tokenNumber"].sort()
    );
  });

  it("never serializes phone numbers to the staff UI", async () => {
    const data = await staff.getStaffDashboardData("queue-1");
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("+92-300-1234567");
    expect(serialized).not.toContain("+92-321-7654321");
  });
});

describe("patient status DTO boundary", () => {
  it("exposes only the patient's own queue position information", async () => {
    const data = await patientStatus.getPatientStatus("entry-7");
    expect(data.entryStatus).toBe("WAITING");
    expect(data.entryNotFound).toBe(false);
    expect(data.queueNotFound).toBe(false);
    expect(data.position).toBeGreaterThan(0);
    expect(data.patientsAhead).toBeGreaterThanOrEqual(0);
    expect(typeof data.estimatedWaitMinutes).toBe("number");
    expect(data.queueStatus).toBe("ACTIVE");
  });

  it("does not expose contact or other patients' information", async () => {
    const data = await patientStatus.getPatientStatus("entry-7");
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("+92-300-1234567");
    expect(serialized).not.toContain("+92-321-7654321");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("patientId");
  });

  it("returns a not-found variant instead of throwing for a missing entry", async () => {
    const data = await patientStatus.getPatientStatus("entry-missing");
    expect(data.entryNotFound).toBe(true);
  });
});