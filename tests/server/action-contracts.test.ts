import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();
const redirects: string[] = [];

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirects.push(path);
    throw new Error(`__NEXT_REDIRECT__:${path}`);
  },
}));

const SESSION_COOKIE_NAME = "queueless_session";
const ENTRY_COOKIE_NAME = "queueless_entry";

type StaffActions = typeof import("@/features/staff/actions");
type DoctorActions = typeof import("@/features/doctor/actions");
type PatientActions = typeof import("@/features/patients/queue-actions");

let staffActions: StaffActions;
let doctorActions: DoctorActions;
let patientActions: PatientActions;

function setSession(userId: string) {
  cookieStore.set(SESSION_COOKIE_NAME, `user:${userId}`);
}

function setEntryCookie(entryId: string) {
  cookieStore.set(
    ENTRY_COOKIE_NAME,
    JSON.stringify({ queueId: "queue-1", entryId })
  );
}

beforeEach(async () => {
  cookieStore.clear();
  redirects.length = 0;
  vi.resetModules();
  staffActions = await import("@/features/staff/actions");
  doctorActions = await import("@/features/doctor/actions");
  patientActions = await import("@/features/patients/queue-actions");
});

describe("server action error codes", () => {
  it("maps domain errors to stable codes", async () => {
    const { toActionErrorCode } = await import("@/lib/queue/action-error");
    const {
      CannotCallNextPatientError,
      InvalidTransitionError,
      NoPatientsWaitingError,
      QueueEntryNotFoundError,
      QueueNotFoundError,
      QueueNotActiveError,
      QueuePausedError,
    } = await import("@/lib/queue/errors");
    const {
      AuthenticationError,
      AuthorizationError,
    } = await import("@/lib/auth/errors");

    expect(toActionErrorCode(new AuthenticationError())).toBe("UNAUTHENTICATED");
    expect(toActionErrorCode(new AuthorizationError())).toBe("FORBIDDEN");
    expect(toActionErrorCode(new QueueNotFoundError("q"))).toBe("QUEUE_NOT_FOUND");
    expect(toActionErrorCode(new QueueEntryNotFoundError("e"))).toBe("ENTRY_NOT_FOUND");
    expect(toActionErrorCode(new QueuePausedError("q"))).toBe("QUEUE_PAUSED");
    expect(toActionErrorCode(new QueueNotActiveError("q", "CLOSED"))).toBe("QUEUE_NOT_ACTIVE");
    expect(toActionErrorCode(new NoPatientsWaitingError("q"))).toBe("NO_PATIENTS_WAITING");
    expect(toActionErrorCode(new InvalidTransitionError("A", "B"))).toBe("INVALID_QUEUE_STATE");
    expect(toActionErrorCode(new CannotCallNextPatientError())).toBe("INVALID_QUEUE_STATE");
    expect(toActionErrorCode(new Error("boom"))).toBe("INTERNAL_ERROR");
  });

  it("returns UNAUTHENTICATED for a logged-out mutation call", async () => {
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
      error: "Please sign in to continue.",
    });
  });

  it("returns FORBIDDEN when a patient calls a staff action", async () => {
    setSession("patient-1");
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});

describe("server action input validation", () => {
  it("rejects an empty queue id on callNextPatientAction", async () => {
    setSession("user-staff");
    const result = await staffActions.callNextPatientAction("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects an empty entry id on markNoShowAction", async () => {
    setSession("user-staff");
    const result = await staffActions.markNoShowAction("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects an empty queue id on pauseQueueAction", async () => {
    setSession("user-staff");
    const result = await staffActions.pauseQueueAction("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects malformed walk-in input", async () => {
    setSession("user-staff");
    const result = await staffActions.addWalkInAction({
      queueId: "",
      name: "Ghost Patient",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.error).toBe("A queue must be selected");
    }
  });

  it("rejects a blank walk-in patient name", async () => {
    setSession("user-staff");
    const result = await staffActions.addWalkInAction({
      queueId: "queue-1",
      name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects an empty queue id on a doctor consultation start", async () => {
    setSession("user-doctor");
    const result = await doctorActions.startConsultationAction("  ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns field errors plus VALIDATION_ERROR for an invalid join", async () => {
    setSession("patient-1");
    const formData = new FormData();
    formData.set("queueId", "");
    formData.set("name", "");
    formData.set("phone", "");

    const result = await patientActions.joinQueueAction({}, formData);
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.fieldErrors).toBeDefined();
    expect(result.error).toBe("Please check the information you entered.");
  });
});

describe("domain error mapping through real actions", () => {
  it("returns QUEUE_NOT_FOUND for an unknown queue", async () => {
    setSession("user-staff");
    const result = await staffActions.pauseQueueAction("queue-does-not-exist");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("QUEUE_NOT_FOUND");
    }
  });

  it("returns ENTRY_NOT_FOUND for an unknown entry", async () => {
    setSession("user-staff");
    const result = await staffActions.markNoShowAction("entry-does-not-exist");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ENTRY_NOT_FOUND");
    }
  });

  it("returns NO_PATIENTS_WAITING when an active queue has nobody waiting", async () => {
    setSession("user-staff");
    const result = await staffActions.callNextPatientAction("queue-2");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("NO_PATIENTS_WAITING");
    }
  });

  it("returns INVALID_QUEUE_STATE when a patient is already being served", async () => {
    setSession("user-staff");
    const result = await staffActions.callNextPatientAction("queue-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_QUEUE_STATE");
    }
  });

  it("returns INVALID_QUEUE_STATE for an illegal consultation transition", async () => {
    setSession("user-doctor");
    // entry-1 is already COMPLETED
    const result = await doctorActions.startConsultationAction("entry-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_QUEUE_STATE");
    }
  });

  it("returns QUEUE_PAUSED when calling a paused queue", async () => {
    setSession("user-staff");
    const paused = await staffActions.pauseQueueAction("queue-1");
    expect(paused.success).toBe(true);

    const result = await staffActions.callNextPatientAction("queue-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("QUEUE_PAUSED");
    }
  });

  it("returns the queue paused code when joining a paused queue", async () => {
    setSession("user-staff");
    await staffActions.pauseQueueAction("queue-1");

    setSession("patient-1");
    const formData = new FormData();
    formData.set("queueId", "queue-1");
    formData.set("name", "Muhammad Hassan");
    formData.set("phone", "+92-300-1234567");

    const result = await patientActions.joinQueueAction({}, formData);
    expect(result.code).toBe("QUEUE_PAUSED");
  });
});

describe("patient cancel contract", () => {
  it("rejects cancellation when there is no stored entry", async () => {
    setSession("patient-1");
    const result = await patientActions.cancelQueueEntryAction();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ENTRY_NOT_FOUND");
    }
  });

  it("denies cancelling another patient's entry with FORBIDDEN", async () => {
    setSession("patient-1");
    setEntryCookie("entry-5"); // entry-5 belongs to patient-2
    const result = await patientActions.cancelQueueEntryAction();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("allows cancelling an owned entry", async () => {
    setSession("patient-1");
    setEntryCookie("entry-7"); // entry-7 belongs to patient-1, WAITING
    const result = await patientActions.cancelQueueEntryAction();
    expect(result.success).toBe(true);
    expect(cookieStore.has(ENTRY_COOKIE_NAME)).toBe(false);
  });
});

describe("queue service framework independence", () => {
  it("runs directly against the repository without Next, cookies or HTTP", async () => {
    const { QueueService } = await import("@/lib/queue/queue-service");
    const { MockQueueRepository } = await import("@/lib/queue/mock-repository");

    const service = new QueueService(new MockQueueRepository());
    const result = await service.joinQueue({
      queueId: "queue-1",
      patientId: "patient-1",
    });

    expect(result.entry.status).toBe("WAITING");
    expect(result.entry.patientId).toBe("patient-1");
    expect(result.position).toBeGreaterThan(0);
  });
});