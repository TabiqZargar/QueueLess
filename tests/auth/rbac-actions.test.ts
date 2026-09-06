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
type AuthActions = typeof import("@/features/auth/actions");

let staffActions: StaffActions;
let doctorActions: DoctorActions;
let patientActions: PatientActions;
let authActions: AuthActions;

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
  authActions = await import("@/features/auth/actions");
});

describe("development login / logout actions", () => {
  it("signs in as patient with the default destination", async () => {
    const formData = new FormData();
    formData.set("role", "PATIENT");

    await expect(authActions.loginAction(undefined, formData)).rejects.toThrow(
      "__NEXT_REDIRECT__:/"
    );
    expect(cookieStore.get(SESSION_COOKIE_NAME)).toBe("user:patient-1");
  });

  it("signs in as staff and preserves the next destination", async () => {
    const formData = new FormData();
    formData.set("role", "STAFF");
    formData.set("next", "/staff/dashboard");

    await expect(authActions.loginAction(undefined, formData)).rejects.toThrow(
      "__NEXT_REDIRECT__:/staff/dashboard"
    );
    expect(cookieStore.get(SESSION_COOKIE_NAME)).toBe("user:user-staff");
  });

  it("sanitizes an open-redirect destination back to the role default", async () => {
    const formData = new FormData();
    formData.set("role", "ADMIN");
    formData.set("next", "https://evil.example.com");

    await expect(authActions.loginAction(undefined, formData)).rejects.toThrow(
      "__NEXT_REDIRECT__:/admin"
    );
  });

  it("rejects an unknown role without creating a session", async () => {
    const formData = new FormData();
    formData.set("role", "TRUSTED_SUPERUSER");

    const result = await authActions.loginAction(undefined, formData);
    expect(result?.error).toBe("Invalid sign-in option.");
    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
    expect(redirects).toHaveLength(0);
  });

  it("signs out by clearing the session and returning home", async () => {
    setSession("user-admin");

    await expect(authActions.logoutAction()).rejects.toThrow(
      "__NEXT_REDIRECT__:/"
    );
    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
  });
});

describe("staff server-action authorization", () => {
  it("denies a logged-out caller with a sign-in message", async () => {
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result.error).toBe("Please sign in to continue.");
  });

  it("denies a patient who manually calls a staff action", async () => {
    setSession("patient-1");
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result.error).toBe(
      "You are not authorized to perform this action."
    );
  });

  it("denies a doctor who manually calls a staff action", async () => {
    setSession("user-doctor");
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result.error).toBe(
      "You are not authorized to perform this action."
    );
  });

  it("denies an admin who manually calls a staff action", async () => {
    setSession("user-admin");
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result.error).toBe(
      "You are not authorized to perform this action."
    );
  });

  it("allows a staff member and performs the operation", async () => {
    setSession("user-staff");
    const result = await staffActions.pauseQueueAction("queue-1");
    expect(result.error).toBeUndefined();
    expect(result.message).toBe("Queue paused.");
  });

  it("allows staff to cancel a queue entry", async () => {
    setSession("user-staff");
    const result = await staffActions.cancelEntryAction("entry-5");
    expect(result.error).toBeUndefined();
    expect(result.message).toContain("cancelled");
  });

  it("denies a patient cancelling entries through the staff action", async () => {
    setSession("patient-1");
    const result = await staffActions.cancelEntryAction("entry-5");
    expect(result.error).toBe(
      "You are not authorized to perform this action."
    );
  });
});

describe("doctor server-action authorization", () => {
  it("denies a patient calling startConsultationAction", async () => {
    setSession("patient-1");
    const result = await doctorActions.startConsultationAction("entry-5");
    expect(result.error).toBe(
      "You are not authorized to perform this action."
    );
  });

  it("denies a staff member calling startConsultationAction", async () => {
    setSession("user-staff");
    const result = await doctorActions.startConsultationAction("entry-5");
    expect(result.error).toBe(
      "You are not authorized to perform this action."
    );
  });

  it("allows a doctor to complete a consultation", async () => {
    setSession("user-doctor");
    const result = await doctorActions.completeConsultationAction("entry-4");
    expect(result.error).toBeUndefined();
    expect(result.message).toContain("completed");
  });
});

describe("patient server-action authorization", () => {
  it("requires sign-in to join a queue", async () => {
    const formData = new FormData();
    formData.set("queueId", "queue-1");
    formData.set("name", "Muhammad Hassan");
    formData.set("phone", "+92-300-1234567");

    const result = await patientActions.joinQueueAction({}, formData);
    expect(result.error).toBe("Please sign in to join a queue.");
  });

  it("denies a staff member joining a queue", async () => {
    setSession("user-staff");
    const formData = new FormData();
    formData.set("queueId", "queue-1");
    formData.set("name", "Muhammad Hassan");
    formData.set("phone", "+92-300-1234567");

    const result = await patientActions.joinQueueAction({}, formData);
    expect(result.error).toBe("You are not authorized to join this queue.");
  });

  it("allows a signed-in patient to join and own their entry", async () => {
    setSession("patient-1");
    const formData = new FormData();
    formData.set("queueId", "queue-1");
    formData.set("name", "Muhammad Hassan");
    formData.set("phone", "+92-300-1234567");

    const result = await patientActions.joinQueueAction({}, formData);
    expect(result.error).toBeUndefined();
    expect(result.result?.tokenNumber).toBe(28);
    expect(cookieStore.has(ENTRY_COOKIE_NAME)).toBe(true);
  });

  it("prevents a patient from cancelling another patient's entry", async () => {
    setSession("patient-1");
    // entry-5 belongs to patient-2
    setEntryCookie("entry-5");

    const result = await patientActions.cancelQueueEntryAction();
    expect(result.error).toBe(
      "You are not authorized to cancel this entry."
    );
  });

  it("allows a patient to cancel their own entry", async () => {
    setSession("patient-1");
    // entry-7 belongs to patient-1 and is still WAITING
    setEntryCookie("entry-7");

    const result = await patientActions.cancelQueueEntryAction();
    expect(result.error).toBeUndefined();
    expect(cookieStore.has(ENTRY_COOKIE_NAME)).toBe(false);
  });

  it("requires sign-in before cancelling an entry", async () => {
    setEntryCookie("entry-7");
    const result = await patientActions.cancelQueueEntryAction();
    expect(result.error).toBe("Please sign in to cancel your entry.");
  });
});