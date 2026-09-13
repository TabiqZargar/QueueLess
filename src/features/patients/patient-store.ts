import { Patient } from "@/types";
import { queueRepository } from "@/lib/queue/instance";
import { QueueRepository } from "@/lib/queue/repository";

/**
 * Patient registration helpers layered on the queue repository.
 *
 * Patient records now go through the queue repository contract so they are
 * persisted durably (PostgreSQL in production, the in-memory mock under
 * tests) instead of a module-local mock registry. The store keeps the
 * phone-dedup and authenticated-user get-or-create semantics on top of the
 * repository primitives.
 */
class PatientStore {
  constructor(private repository: QueueRepository) {}

  async registerPatient(input: {
    name: string;
    phone: string;
    clinicId: string;
  }): Promise<Patient> {
    const existing = await this.repository.findPatientByPhone(input.phone);
    if (existing) {
      return existing;
    }

    return this.repository.createPatient({
      id: crypto.randomUUID(),
      name: input.name,
      phone: input.phone,
      clinicId: input.clinicId,
    });
  }

  /**
   * Returns the patient record for an authenticated user, creating it if
   * necessary. The record id is the authenticated user's id so queue entries
   * are owned by the signed-in patient (ownership checks use this id).
   */
  async getOrCreatePatientForUser(input: {
    userId: string;
    name: string;
    phone: string;
    clinicId: string;
  }): Promise<Patient> {
    const existing = await this.repository.getPatient(input.userId);
    if (existing) {
      return existing;
    }

    return this.repository.createPatient({
      id: input.userId,
      name: input.name,
      phone: input.phone,
      clinicId: input.clinicId,
    });
  }

  async getPatient(patientId: string): Promise<Patient | null> {
    return this.repository.getPatient(patientId);
  }
}

export function getPatientStore(): PatientStore {
  return new PatientStore(queueRepository);
}