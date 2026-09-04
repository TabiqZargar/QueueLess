export type UserRole = "PATIENT" | "STAFF" | "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  clinicId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  clinicId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Doctor {
  id: string;
  userId?: string;
  displayName: string;
  departmentId: string;
  status: "ACTIVE" | "INACTIVE";
  averageConsultationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  contact: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  clinicId: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export type QueueStatus =
  | "NOT_STARTED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export interface Queue {
  id: string;
  clinicId: string;
  departmentId: string;
  doctorId: string;
  queueDate: Date;
  status: QueueStatus;
  currentToken: number;
  startedAt?: Date;
  pausedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type QueueEntryStatus =
  | "REGISTERED"
  | "WAITING"
  | "CALLED"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

export type EntryType = "APPOINTMENT" | "WALK_IN";

export interface QueueEntry {
  id: string;
  queueId: string;
  patientId: string;
  tokenNumber: number;
  entryType: EntryType;
  status: QueueEntryStatus;
  joinedAt: Date;
  calledAt?: Date;
  consultationStartedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export type QueueEventType =
  | "QUEUE_CREATED"
  | "PATIENT_REGISTERED"
  | "QUEUE_JOINED"
  | "PATIENT_CALLED"
  | "CONSULTATION_STARTED"
  | "CONSULTATION_COMPLETED"
  | "PATIENT_NO_SHOW"
  | "PATIENT_CANCELLED"
  | "WALK_IN_ADDED"
  | "QUEUE_PAUSED"
  | "QUEUE_RESUMED"
  | "DOCTOR_DELAYED";

export interface QueueEvent {
  id: string;
  queueId: string;
  queueEntryId?: string;
  actorUserId?: string;
  eventType: QueueEventType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface QueuePosition {
  position: number;
  patientsAhead: number;
  estimatedWaitMinutes: number;
  currentServingToken: number;
  totalInQueue: number;
}
