import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => cookieStore.set(name, value),
    delete: (name: string) => cookieStore.delete(name),
  }),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      status: (init as { status?: number } | undefined)?.status ?? 200,
      body,
    }),
  },
}));

const SESSION_COOKIE_NAME = "queueless_session";

type RouteResponse = { status: number; body: unknown };

type GetHandler = (request: unknown) => Promise<RouteResponse>;

let GET: GetHandler;

function setSession(userId: string): void {
  cookieStore.set(SESSION_COOKIE_NAME, `user:${userId}`);
}

function makeRequest(url: string): { nextUrl: URL } {
  return { nextUrl: new URL(url) };
}

beforeEach(async () => {
  cookieStore.clear();
  vi.resetModules();
  GET = (
    await import("@/app/api/realtime/events/route")
  ).GET as unknown as GetHandler;
});

describe("GET /api/realtime/events", () => {
  it("rejects a missing queue id", async () => {
    const res = await GET(makeRequest("http://localhost/api/realtime/events"));

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("rejects an invalid after cursor", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-1&after=abc")
    );

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("requires an authenticated session", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-1")
    );

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("allows STAFF on any queue", async () => {
    setSession("user-staff");
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-1&after=5")
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { events: [], latestSequence: 5 },
    });
  });

  it("allows a PATIENT with an active entry in the queue", async () => {
    setSession("patient-1");
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-1")
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });

  it("forbids a PATIENT outside the queue", async () => {
    setSession("patient-1");
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-2")
    );

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("forbids a DOCTOR subscribed to another doctor's queue", async () => {
    setSession("user-doctor");
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-2")
    );

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("allows a DOCTOR on their own queue", async () => {
    setSession("user-doctor");
    const res = await GET(
      makeRequest("http://localhost/api/realtime/events?queue=queue-1")
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });
});