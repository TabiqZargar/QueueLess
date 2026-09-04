import { Clinic, Department, Doctor, Patient } from "@/types";

export const mockClinics: Clinic[] = [
  {
    id: "clinic-1",
    name: "City Health Clinic",
    address: "123 Medical Center Drive, Karachi",
    contact: "+92-21-1234567",
    timezone: "Asia/Karachi",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

export const mockDepartments: Department[] = [
  {
    id: "dept-1",
    clinicId: "clinic-1",
    name: "General Medicine",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "dept-2",
    clinicId: "clinic-1",
    name: "Cardiology",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

export const mockDoctors: Doctor[] = [
  {
    id: "doc-1",
    displayName: "Dr. Ahmed Khan",
    departmentId: "dept-1",
    status: "ACTIVE",
    averageConsultationMinutes: 7,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "doc-2",
    displayName: "Dr. Fatima Ali",
    departmentId: "dept-2",
    status: "ACTIVE",
    averageConsultationMinutes: 10,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

export const mockPatients: Patient[] = [
  {
    id: "patient-1",
    name: "Muhammad Hassan",
    phone: "+92-300-1234567",
    email: "hassan@example.com",
    clinicId: "clinic-1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "patient-2",
    name: "Ayesha Siddiqui",
    phone: "+92-321-7654321",
    clinicId: "clinic-1",
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "patient-3",
    name: "Ali Raza",
    phone: "+92-333-9876543",
    email: "ali.raza@example.com",
    clinicId: "clinic-1",
    createdAt: new Date("2024-01-17"),
    updatedAt: new Date("2024-01-17"),
  },
];
