import { describe, expect, it } from "vitest";
import type { QueueWithDetails } from "@/lib/queue/repository";
import type { QueueStatus } from "@/types";
import {
  buildJoinableQueueCards,
  displayDepartmentName,
  displayDoctorName,
  DEFAULT_DEPARTMENT_LABEL,
  DEFAULT_DOCTOR_LABEL,
} from "@/app/(patient)/join/join-queue-model";

const activeQueue: QueueWithDetails = {
  id: "queue-1",
  clinicId: "clinic-1",
  departmentId: "dept-1",
  doctorId: "doc-1",
  queueDate: new Date(),
  status: "ACTIVE" as QueueStatus,
  currentToken: 5,
  startedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  doctor: {
    id: "doc-1",
    displayName: "Dr. Ahmed Khan",
    departmentId: "dept-1",
    status: "ACTIVE",
    averageConsultationMinutes: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  departmentName: "General Medicine",
  clinicName: "City Health Clinic",
};

describe("buildJoinableQueueCards", () => {
  it("maps doctor name, department name, and clinic name from QueueWithDetails", () => {
    const statsByQueue = new Map([
      [
        "queue-1",
        { totalWaiting: 3, estimatedWaitMinutes: 12, currentToken: 5 },
      ],
    ]);
    const cards = buildJoinableQueueCards([activeQueue], statsByQueue);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: "queue-1",
      status: "ACTIVE",
      departmentName: "General Medicine",
      doctorName: "Dr. Ahmed Khan",
      clinicName: "City Health Clinic",
      averageConsultationMinutes: 7,
    });
  });

  it("maps stats when present in the lookup map", () => {
    const statsByQueue = new Map([
      [
        "queue-1",
        { totalWaiting: 3, estimatedWaitMinutes: 12, currentToken: 5 },
      ],
    ]);
    const cards = buildJoinableQueueCards([activeQueue], statsByQueue);

    expect(cards[0].stats).toEqual({
      totalWaiting: 3,
      estimatedWaitMinutes: 12,
      currentToken: 5,
    });
  });

  it("omits stats when the queue is not in the lookup map", () => {
    const cards = buildJoinableQueueCards([activeQueue], new Map());
    expect(cards[0].stats).toBeUndefined();
  });

  it("returns an empty array when given no queues", () => {
    expect(buildJoinableQueueCards([], new Map())).toEqual([]);
  });

  it("preserves undefined doctor/department when source has no data", () => {
    const bareQueue: QueueWithDetails = {
      ...activeQueue,
      doctor: undefined,
      departmentName: undefined,
      clinicName: undefined,
    };
    const cards = buildJoinableQueueCards([bareQueue], new Map());

    expect(cards[0].doctorName).toBeUndefined();
    expect(cards[0].departmentName).toBeUndefined();
    expect(cards[0].clinicName).toBeUndefined();
    expect(cards[0].averageConsultationMinutes).toBeUndefined();
  });
});

describe("displayDepartmentName", () => {
  it("returns department name when present", () => {
    const card = { id: "q1", status: "ACTIVE" as QueueStatus, departmentName: "Cardiology" };
    expect(displayDepartmentName(card)).toBe("Cardiology");
  });

  it("returns default fallback when department name is undefined", () => {
    const card = { id: "q1", status: "ACTIVE" as QueueStatus };
    expect(displayDepartmentName(card)).toBe(DEFAULT_DEPARTMENT_LABEL);
  });

  it("returns empty string fallback when department name is empty", () => {
    const card = {
      id: "q1",
      status: "ACTIVE" as QueueStatus,
      departmentName: "",
    };
    expect(displayDepartmentName(card)).toBe("");
  });
});

describe("displayDoctorName", () => {
  it("returns doctor name when present", () => {
    const card = {
      id: "q1",
      status: "ACTIVE" as QueueStatus,
      doctorName: "Dr. Fatima Ali",
    };
    expect(displayDoctorName(card)).toBe("Dr. Fatima Ali");
  });

  it("returns default fallback when doctor name is undefined", () => {
    const card = { id: "q1", status: "ACTIVE" as QueueStatus };
    expect(displayDoctorName(card)).toBe(DEFAULT_DOCTOR_LABEL);
  });

  it("returns empty string fallback when doctor name is empty", () => {
    const card = {
      id: "q1",
      status: "ACTIVE" as QueueStatus,
      doctorName: "",
    };
    expect(displayDoctorName(card)).toBe("");
  });
});

describe("no hardcoded Stitch fake data", () => {
  it("model exports contain no reference to Dr. Sarah Lin", async () => {
    const mod = await import("@/app/(patient)/join/join-queue-model");
    const values = Object.values(mod);
    for (const value of values) {
      if (typeof value === "string") {
        expect(value).not.toMatch(/sarah lin/i);
      }
    }
  });

  it("model exports contain no reference to hardcoded queue IDs like 'demo'", async () => {
    const mod = await import("@/app/(patient)/join/join-queue-model");
    const values = Object.values(mod);
    for (const value of values) {
      if (typeof value === "string") {
        expect(value).not.toMatch(/demo-queue|sample-queue|hardcoded/i);
      }
    }
  });
});
