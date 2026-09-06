import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();

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

import {
  getCurrentUser,
  getSession,
  requireUser,
  requireRole,
  requireAnyRole,
  ensureOwnership,
} from "@/lib/auth/authorization";
import {
  createSession,
  destroySession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/auth/errors";
import { USER_ROLES } from "@/lib/auth/roles";

beforeEach(() => {
  cookieStore.clear();
});

describe("session resolution", () => {
  it("returns no session when signed out", async () => {
    expect(await getSession()).toBeNull();
    expect(await getCurrentUser()).toBeNull();
  });

  it("resolves the mocked user after a session is created", async () => {
    await createSession("patient-1");

    const session = await getSession();
    expect(session?.user).toMatchObject({
      id: "patient-1",
      name: "Muhammad Hassan",
      role: "PATIENT",
    });
    expect(await getCurrentUser()).toMatchObject({
      id: "patient-1",
      role: "PATIENT",
    });
  });

  it("rejects session values that are not user-prefixed", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "anything-else");
    expect(await getSession()).toBeNull();
  });

  it("treats unknown user ids as no session", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "user:no-such-user");
    expect(await getSession()).toBeNull();
  });

  it("clears the session after destroySession", async () => {
    await createSession("user-staff");
    await destroySession();
    expect(await getSession()).toBeNull();
  });
});

describe("authorization helpers", () => {
  it("requireUser throws AuthenticationError when signed out", async () => {
    await expect(requireUser()).rejects.toThrow(AuthenticationError);
  });

  it("requireUser returns the authenticated user", async () => {
    await createSession("user-admin");
    await expect(requireUser()).resolves.toMatchObject({ role: "ADMIN" });
  });

  it("requireRole allows the matching role", async () => {
    await createSession("user-doctor");
    await expect(requireRole(USER_ROLES.DOCTOR)).resolves.toMatchObject({
      id: "user-doctor",
    });
  });

  it("requireRole throws AuthorizationError for the wrong role", async () => {
    await createSession("user-staff");
    await expect(requireRole(USER_ROLES.DOCTOR)).rejects.toThrow(
      AuthorizationError
    );
  });

  it("requireRole throws AuthenticationError when signed out - not AuthorizationError", async () => {
    await expect(requireRole(USER_ROLES.STAFF)).rejects.toThrow(
      AuthenticationError
    );
  });

  it("requireAnyRole allows any role in the set", async () => {
    await createSession("user-staff");
    await expect(
      requireAnyRole([USER_ROLES.STAFF, USER_ROLES.DOCTOR])
    ).resolves.toMatchObject({ role: "STAFF" });
  });

  it("requireAnyRole denies roles outside the set", async () => {
    await createSession("user-staff");
    await expect(
      requireAnyRole([USER_ROLES.DOCTOR, USER_ROLES.ADMIN])
    ).rejects.toThrow(AuthorizationError);
  });

  it("ensureOwnership passes when ids match and throws otherwise", () => {
    expect(() => ensureOwnership("patient-1", "patient-1")).not.toThrow();
    expect(() => ensureOwnership("patient-1", "patient-2")).toThrow(
      AuthorizationError
    );
  });
});