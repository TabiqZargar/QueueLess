import "dotenv/config";
import { db } from "./db.ts";

const timestamp = "2026-09-11T09:00:00.000Z";

async function ensure(model: any, id: string, data: Record<string, unknown>) {
  const existing = await model.where({ id }).first();
  if (!existing) {
    await model.create({ id, ...data });
  }
}

async function main() {
  await ensure(db.orm.public.Clinic, "clinic-1", {
    name: "City Health Clinic",
    address: "123 Medical Center Drive, Karachi",
    contact: "+92-21-1234567",
    timezone: "Asia/Karachi",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const users = [
    ["patient-1", "Muhammad Hassan", "patient@example.com", "PATIENT"],
    ["patient-2", "Ayesha Siddiqui", "ayesha@example.com", "PATIENT"],
    ["patient-3", "Ali Raza", "ali@example.com", "PATIENT"],
    ["user-staff", "Staff Operator", "staff@example.com", "STAFF"],
    ["user-doctor", "Dr. Ahmed Khan", "doctor@example.com", "DOCTOR"],
    ["user-admin", "System Administrator", "admin@example.com", "ADMIN"],
  ] as const;
  for (const [id, name, email, role] of users) {
    await ensure(db.orm.public.User, id, {
      name,
      email,
      phone: null,
      role,
      clinicId: "clinic-1",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const patients = [
    ["patient-1", "Muhammad Hassan", "+92-300-1234567", "hassan@example.com"],
    ["patient-2", "Ayesha Siddiqui", "+92-321-7654321", null],
    ["patient-3", "Ali Raza", "+92-333-9876543", "ali.raza@example.com"],
  ] as const;
  for (const [id, name, phone, email] of patients) {
    await ensure(db.orm.public.Patient, id, {
      name,
      phone,
      email,
      clinicId: "clinic-1",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await ensure(db.orm.public.Department, "dept-1", {
    clinicId: "clinic-1",
    name: "General Medicine",
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await ensure(db.orm.public.Department, "dept-2", {
    clinicId: "clinic-1",
    name: "Cardiology",
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await ensure(db.orm.public.Doctor, "doc-1", {
    userId: "user-doctor",
    displayName: "Dr. Ahmed Khan",
    departmentId: "dept-1",
    status: "ACTIVE",
    averageConsultationMinutes: 7,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await ensure(db.orm.public.Doctor, "doc-2", {
    userId: null,
    displayName: "Dr. Fatima Ali",
    departmentId: "dept-2",
    status: "ACTIVE",
    averageConsultationMinutes: 10,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await ensure(db.orm.public.Queue, "queue-1", {
    clinicId: "clinic-1",
    departmentId: "dept-1",
    doctorId: "doc-1",
    queueDate: timestamp,
    status: "ACTIVE",
    currentToken: 23,
    startedAt: timestamp,
    pausedAt: null,
    endedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await ensure(db.orm.public.Queue, "queue-2", {
    clinicId: "clinic-1",
    departmentId: "dept-2",
    doctorId: "doc-2",
    queueDate: timestamp,
    status: "ACTIVE",
    currentToken: 15,
    startedAt: timestamp,
    pausedAt: null,
    endedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const entries = [
    ["entry-1", "queue-1", "patient-1", 18, "COMPLETED", "2026-09-11T07:00:00.000Z"],
    ["entry-2", "queue-1", "patient-2", 19, "COMPLETED", "2026-09-11T07:05:00.000Z"],
    ["entry-3", "queue-1", "patient-3", 20, "COMPLETED", "2026-09-11T07:10:00.000Z"],
    ["entry-4", "queue-1", "patient-1", 21, "IN_CONSULTATION", "2026-09-11T07:20:00.000Z"],
    ["entry-5", "queue-1", "patient-2", 22, "WAITING", "2026-09-11T07:25:00.000Z"],
    ["entry-6", "queue-1", "patient-3", 23, "WAITING", "2026-09-11T07:30:00.000Z"],
    ["entry-7", "queue-2", "patient-2", 16, "WAITING", "2026-09-11T07:35:00.000Z"],
  ] as const;
  for (const [id, queueId, patientId, tokenNumber, status, joinedAt] of entries) {
    await ensure(db.orm.public.QueueEntry, id, {
      queueId,
      patientId,
      tokenNumber,
      entryType: "APPOINTMENT",
      status,
      joinedAt,
      calledAt: status === "COMPLETED" || status === "IN_CONSULTATION" ? timestamp : null,
      consultationStartedAt: status === "COMPLETED" || status === "IN_CONSULTATION" ? timestamp : null,
      completedAt: status === "COMPLETED" ? timestamp : null,
      cancelledAt: null,
    });
  }

  const events = [
    ["event-1", "queue-1", null, "QUEUE_CREATED"],
    ["event-2", "queue-1", "entry-5", "QUEUE_JOINED"],
    ["event-3", "queue-1", "entry-4", "PATIENT_CALLED"],
    ["event-4", "queue-1", "entry-4", "CONSULTATION_STARTED"],
    ["event-5", "queue-2", "entry-7", "QUEUE_JOINED"],
  ] as const;
  for (const [id, queueId, queueEntryId, eventType] of events) {
    await ensure(db.orm.public.QueueEvent, id, {
      queueId,
      queueEntryId,
      actorUserId: "user-staff",
      eventType,
      timestamp,
      metadata: null,
    });
  }

  await ensure(db.orm.public.Notification, "notification-1", {
    userId: "patient-1",
    type: "CONSULTATION_STARTED",
    title: "Consultation started",
    message: "Your consultation has started.",
    channel: "IN_APP",
    queueId: "queue-1",
    entryId: "entry-4",
    eventId: "event-4",
    dedupeKey: null,
    createdAt: timestamp,
    readAt: null,
  });
  await ensure(db.orm.public.Notification, "notification-2", {
    userId: "patient-2",
    type: "TURN_APPROACHING",
    title: "Your turn is approaching",
    message: "Please be ready for your consultation.",
    channel: "IN_APP",
    queueId: "queue-1",
    entryId: "entry-5",
    eventId: null,
    dedupeKey: "queue-1:entry-5:TURN_APPROACHING",
    createdAt: timestamp,
    readAt: null,
  });

  console.log("QueueLess database seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
