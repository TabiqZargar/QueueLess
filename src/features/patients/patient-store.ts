import { Patient } from "@/types";
import { mockPatients } from "@/mocks/clinics";

/**
 * Temporary in-memory patient registry used during development until the
 * real persistence/auth layer is integrated by the database contributor.
 *
 * It is seeded with the mock patients and supports registering new patients
 * entered through the patient join flow. This is intentionally a simple,
 * easily-replaced mechanism and is NOT part of the queue repository contract.
 */
class PatientStore {
  private patients: Patient[];
  private nextPatientId = 1000;

  constructor() {
    this.patients = mockPatients.map((p) => ({ ...p }));
  }

  registerPatient(input: {
    name: string;
    phone: string;
    clinicId: string;
  }): Patient {
    const existing = this.patients.find(
      (p) => p.phone.toLowerCase() === input.phone.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    const patient: Patient = {
      id: `patient-${this.nextPatientId++}`,
      name: input.name,
      phone: input.phone,
      clinicId: input.clinicId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.patients.push(patient);
    return patient;
  }

  getPatient(patientId: string): Patient | null {
    return this.patients.find((p) => p.id === patientId) ?? null;
  }
}

const patientStore = new PatientStore();

export function getPatientStore(): PatientStore {
  return patientStore;
}