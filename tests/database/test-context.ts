import { randomUUID } from "node:crypto";
import { db } from "../../prisma/db";
import { QueueEntryStatus } from "@/types";
import { QueueService } from "@/lib/queue/queue-service";
import { PrismaQueueRepository } from "@/lib/queue/prisma-repository";
import { NotificationService } from "@/lib/notifications/service";
import { PrismaNotificationRepository } from "@/lib/notifications/prisma-repository";
import { NotificationPolicy } from "@/lib/notifications/policy";
import {
  QueueEventNotificationHandler,
  SafeNotificationHandler,
} from "@/lib/notifications/event-handler";
import { InAppNotificationDelivery } from "@/lib/notifications/delivery";
import { InMemoryRealtimeTransport } from "@/lib/realtime/in-memory-transport";
import { createQueuePublisher } from "@/lib/realtime/publisher";

/**
 * Shared scaffolding for database-backed validation tests.
 *
 * Every helper builds fresh Prisma repository instances directly (never the
 * application singletons, which fall back to mocks under NODE_ENV=test) and
 * creates a fully isolated queue subtree (clinic -> department -> doctor ->
 * queue -> users/patients/entries) so tests never touch the seeded reference
 * data and can clean up deterministically.
 */

export interface SeedEntryOptions {
  id: string;
  patientId: string;
  tokenNumber: number;
  status: QueueEntryStatus;
  calledAt?: string;
  consultationStartedAt?: string;
  completedAt?: string;
}

export interface TestQueueContext {
  queueId: string;
  clinicId: string;
  departmentId: string;
  doctorId: string;
  patientIds: string[];
  entryIds: string[];
  cleanup: () => Promise<void>;
}

function uniqueSuffix(): string {
  return randomUUID().replace(/-/g, "");
}

export async function createIsolatedQueue(
  options: {
    queueId?: string;
    averageConsultationMinutes?: number;
    patientIds?: string[];
    existingPatientIds?: string[];
    entries?: SeedEntryOptions[];
  } = {}
): Promise<TestQueueContext> {
  const suffix = uniqueSuffix();
  const queueId = options.queueId ?? `queue-test-${suffix}`;
  const clinicId = `clinic-test-${suffix}`;
  const departmentId = `dept-test-${suffix}`;
  const doctorId = `doctor-test-${suffix}`;
  const patientIds = options.patientIds ?? [];
  const existingPatientIds = options.existingPatientIds ?? [];
  const timestamp = new Date().toISOString();

  await db.orm.public.Clinic.create({
    id: clinicId,
    name: "QueueLess Test Clinic",
    address: "Test Address",
    contact: "+00-0000",
    timezone: "UTC",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.orm.public.Department.create({
    id: departmentId,
    clinicId,
    name: "QueueLess Test Department",
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.orm.public.Doctor.create({
    id: doctorId,
    userId: null,
    displayName: "QueueLess Test Doctor",
    departmentId,
    status: "ACTIVE",
    averageConsultationMinutes: options.averageConsultationMinutes ?? 7,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await db.orm.public.Queue.create({
    id: queueId,
    clinicId,
    departmentId,
    doctorId,
    queueDate: timestamp,
    status: "ACTIVE",
    currentToken: 0,
    startedAt: timestamp,
    pausedAt: null,
    endedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  for (const patientId of patientIds) {
    await db.orm.public.User.create({
      id: patientId,
      clinicId,
      email: `${patientId}@queueless.test`,
      name: `Test Patient ${patientId}`,
      phone: null,
      role: "PATIENT",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.orm.public.Patient.create({
      id: patientId,
      clinicId,
      name: `Test Patient ${patientId}`,
      phone: `+00-${patientId}`,
      email: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const entryIds: string[] = [];
  for (const entry of options.entries ?? []) {
    await db.orm.public.QueueEntry.create({
      id: entry.id,
      queueId,
      patientId: entry.patientId,
      tokenNumber: entry.tokenNumber,
      entryType: "APPOINTMENT",
      status: entry.status,
      joinedAt: timestamp,
      calledAt: entry.calledAt ?? null,
      consultationStartedAt: entry.consultationStartedAt ?? null,
      completedAt: entry.completedAt ?? null,
      cancelledAt: null,
    });
    entryIds.push(entry.id);
  }

  const cleanup = async () => {
    await db.orm.public.Notification.where({ queueId }).deleteAll();
    await db.orm.public.QueueEvent.where({ queueId }).deleteAll();
    await db.orm.public.QueueEntry.where({ queueId }).deleteAll();
    for (const patientId of patientIds) {
      await db.orm.public.User.where({ id: patientId }).delete();
      await db.orm.public.Patient.where({ id: patientId }).delete();
    }
    // existingPatientIds reference shared (seeded) rows and are never deleted.
    void existingPatientIds;
    await db.orm.public.Queue.where({ id: queueId }).delete();
    await db.orm.public.Doctor.where({ id: doctorId }).delete();
    await db.orm.public.Department.where({ id: departmentId }).delete();
    await db.orm.public.Clinic.where({ id: clinicId }).delete();
  };

  return {
    queueId,
    clinicId,
    departmentId,
    doctorId,
    patientIds: [...patientIds, ...existingPatientIds],
    entryIds,
    cleanup,
  };
}

/**
 * Builds the full real-time + notification pipeline over PostgreSQL, mirroring
 * the mock-backed stack in tests/notifications/integration.test.ts.
 */
export function buildPostgresStack() {
  const queueRepository = new PrismaQueueRepository();
  const notificationRepository = new PrismaNotificationRepository();
  const notificationService = new NotificationService(notificationRepository);
  const transport = new InMemoryRealtimeTransport();
  const publisher = createQueuePublisher(transport);

  let serviceRef!: QueueService;
  const policy = new NotificationPolicy({ getQueueService: () => serviceRef });
  const handler = new SafeNotificationHandler(
    new QueueEventNotificationHandler(
      policy,
      notificationService,
      new InAppNotificationDelivery()
    )
  );
  serviceRef = new QueueService(queueRepository, publisher, handler);

  return {
    queueService: serviceRef,
    queueRepository,
    notificationService,
    notificationRepository,
    transport,
  };
}

/**
 * Repository/service combo without realtime or notifications, for focused
 * queue-semantics tests (e.g. concurrency).
 */
export function buildLeanQueueService(): QueueService {
  return new QueueService(new PrismaQueueRepository());
}