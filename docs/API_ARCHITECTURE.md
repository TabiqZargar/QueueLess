# QueueLess — Server & API Architecture

This document is the canonical description of QueueLess's server boundary: how
the UI reaches the queue domain, how every server entry point is structured,
and the contracts that will stay stable when realtime (Phase 8) and database
persistence (Phase 12) arrive.

## Server architecture

```text
UI
 ↓
Server Entry Point (Server Action | future Route Handler)
 ↓
Authentication  (requireUser / requireRole)
 ↓
Authorization   (RBAC + ownership)
 ↓
Validation      (zod schemas at the boundary)
 ↓
QueueService    (application service — the only business-logic authority)
 ↓
QueueRepository (persistence abstraction — MockQueueRepository today)
```

The server entry point is intentionally thin: it authenticates, authorizes,
validates, delegates to `QueueService`, and maps results/errors. It never
contains queue state-transition, position, or ETA logic.

### Dependency rules

- **Server Actions / Route Handlers** know about Next.js, cookies, HTTP, forms.
- **QueueService** knows **nothing** about Next.js, cookies, `redirect()`,
  `headers()`, forms, React, or HTTP. It depends only on `QueueRepository`.
- **QueueRepository** is the persistence seam. Today it is
  `MockQueueRepository`; Phase 12 replaces it with a Prisma-backed
  implementation **without changing the server/API contract**.

The application-wide service instance is wired in `src/lib/queue/instance.ts` —
the single place that swaps the repository implementation.

## Server entry points

### Server actions (today)

All mutations are server actions. They live inside feature modules:

| Feature | Module | Actions |
| --- | --- | --- |
| Auth | `src/features/auth/actions.ts` | `loginAction`, `logoutAction` |
| Staff | `src/features/staff/actions.ts` | `callNextPatientAction`, `markNoShowAction`, `cancelEntryAction`, `addWalkInAction`, `pauseQueueAction`, `resumeQueueAction` |
| Doctor | `src/features/doctor/actions.ts` | `startConsultationAction`, `completeConsultationAction` |
| Patient | `src/features/patients/queue-actions.ts` | `joinQueueAction`, `cancelQueueEntryAction` |

Reads are server components / feature view-model assemblers:

| Read | Module | Access |
| --- | --- | --- |
| `getStaffDashboardData` | `src/features/staff/get-staff-data.ts` | staff route (layout-gated) |
| `getDoctorDashboardData` | `src/features/doctor/get-doctor-data.ts` | doctor route (layout-gated) |
| `getPatientStatus` | `src/features/patients/get-patient-status.ts` | public, entry-cookie-scoped |
| `queueService.listQueues/getQueue/getQueueStats` | pages | public / layout-gated |

### Route handlers (future)

There are **no `/api` route handlers today** and no API surface is created for
its own sake. Route handlers are introduced only when a non-browser consumer
exists (see "Server action vs API" below). Once introduced they follow the same
pipeline: parse input → authenticate → authorize → validate → service → DTO →
HTTP response.

## Consistent server operation pattern

Every mutation order of operations:

```text
1. Authenticate      requireRole(...) (also authorizes)
2. Validate          zod schema safeParse at the boundary
3. Invoke service    queueService.<operation>(parsed.data)
4. Map errors        toActionResultError(err) → safe message + stable code
5. Return result     ActionResult<T>
```

Example (`src/features/staff/actions.ts`):

```ts
export async function pauseQueueAction(queueId: string): Promise<ActionResult> {
  try {
    await requireRole(USER_ROLES.STAFF);

    const parsed = queueIdSchema.safeParse(queueId);
    if (!parsed.success) {
      return { success: false, code: "VALIDATION_ERROR", error: parsed.error.issues[0]?.message };
    }

    await queueService.pauseQueue(parsed.data);
    return { success: true, message: "Queue paused." };
  } catch (err) {
    return toActionResultError(err);
  }
}
```

The form-based `joinQueueAction` intentionally validates before authentication
so the client can render per-field errors; the security boundary is unaffected —
role authorization still happens server-side before the service is called.

## Action result contract

All mutation actions return the shared discriminated union defined in
`src/lib/queue/action-error.ts`:

```ts
type ActionResult<T = void> =
  | { success: true; data?: T; message?: string; error?: never }
  | { success: false; error: string; code: ErrorCode; message?: never };
```

- Success carries an optional payload and an optional human message.
- Failure always carries a stable machine-readable `code` **and** a safe
  user-facing `error`. Clients must branch on `code`, never parse `error`
  strings.

## Error codes

`ErrorCode` is derived from the domain errors in `src/lib/queue/errors.ts` and
`src/lib/auth/errors.ts`:

| ErrorCode | Source error |
| --- | --- |
| `UNAUTHENTICATED` | `AuthenticationError` |
| `FORBIDDEN` | `AuthorizationError` (role or ownership) |
| `VALIDATION_ERROR` | zod schema rejections at the boundary |
| `QUEUE_NOT_FOUND` | `QueueNotFoundError` |
| `QUEUE_NOT_ACTIVE` | `QueueNotActiveError` |
| `QUEUE_PAUSED` | `QueuePausedError` |
| `QUEUE_CLOSED` | `QueueClosedError` |
| `ENTRY_NOT_FOUND` | `QueueEntryNotFoundError` |
| `INVALID_QUEUE_STATE` | `InvalidTransitionError`, `CannotCallNextPatientError` |
| `NO_PATIENTS_WAITING` | `NoPatientsWaitingError` |
| `INTERNAL_ERROR` | any other `QueueError` / unknown error |

Mapping lives in `toActionErrorCode` and `toActionResultError`
(`src/lib/queue/action-error.ts`). The transport never exposes stack traces,
repository internals, or internal exception messages.

## Validation boundary

All externally callable mutations validate at the server boundary. Client-side
types, HTML constraints, hidden fields, and query parameters are **not** trust
boundaries.

Shared schemas:

- `src/lib/validation/identifiers.ts` — `queueIdSchema`, `entryIdSchema`
  (trimmed, required, length-bounded; no database-specific ID format so mock
  ids keep working and a future Prisma format is a drop-in).
- `src/lib/validation/staff.ts` — `addWalkInSchema`.
- `src/lib/validation/patient.ts` — `joinQueueSchema`.

Identifiers are never trusted because they originate from the UI: ownership is
re-checked server-side for patient actions, and role authorization runs before
any service call.

## Read operations & access boundary

| Operation | Public | Patient | Staff | Doctor | Admin |
| --- | --- | --- | --- | --- | --- |
| `listQueues` | ✓ (active-only for join page) | ✓ | ✓ | ✓ | via route |
| `getQueue` / `getQueueStats` (overview) | ✓ | ✓ | ✓ | ✓ | via route |
| `getPatientStatus` | ✓ (entry-cookie-scoped, own entry only) | ✓ | – | – | – |
| `getStaffDashboardData` | – | – | ✓ route-gated | – | – |
| `getDoctorDashboardData` | – | – | – | ✓ route-gated | – |
| `getQueueEvents` (activity) | – | – | ✓ via staff VM | – | – |

Role gates are enforced at the route (layout) boundary for dashboard reads and
at the action boundary for every mutation. The read assemblers themselves do
not reach into the repository — they compose the public `QueueService` API.

## DTO boundary & data minimization

Repository/domain models are **not** exposed to the UI. Each feature assembles
a view-model (VM) / DTO at the server boundary:

- **Staff** — `StaffDashboardData` → `StaffCurrentPatientVM`, `StaffWaitListVM`,
  `QueueActivityItem`, `StaffStatusCounts`. Operational fields only; patient
  contact details never leave the server.
- **Doctor** — `DoctorDashboardData` → `DoctorCurrentPatient`,
  `DoctorUpcomingEntry`. Upcoming entries expose token / position / ETA only —
  no `patientId`, `queueId`, `joinedAt` or names for whoever is merely waiting.
  The doctor sees the *current* patient's name (needed to call them) and token;
  no medical or clinical data is ever modeled or exposed.
- **Patient** — `PatientStatusData` — own token, position, ETA, queue status.
  No contact details, no other patients' data.

When Phase 12 replaces the repository with Prisma, the mapping functions
(`toDoctorCurrentPatient`, the staff/patient assemblers) are the seam that
absorbs the model change — the UI contract does not change.

## Server action vs API

| Concern | Use |
| --- | --- |
| Browser-driven mutations, forms, authenticated dashboard operations | **Server actions** |
| External clients, mobile app, third-party integrations, webhooks | **Route handlers** (future) |

Server actions are not turned into API endpoints prematurely. API endpoints
are justified only by a real non-browser consumer. When introduced, the
response contract will be:

```jsonc
// 200 OK
{ "success": true, "data": {} }

// 4xx/5xx
{ "success": false, "error": { "code": "QUEUE_PAUSED", "message": "..." } }
```

with appropriate HTTP status codes (200/201/400/401/403/404/409/422/500)
mapped from the same `ErrorCode` vocabulary used by server actions.

## Security invariants

- Role always comes from the HTTP-only session resolved server-side; the
  client can never select its role.
- Query parameters cannot raise privileges; hidden UI is not security.
- Patient-scoped resources verify ownership via `ensureOwnership`.
- No secrets, cookies, or repository internals in responses or logs.
- No verbose request logging introduces sensitive data.

## Database handoff (Phase 12)

`MockQueueRepository` is replaced by `PrismaQueueRepository` in
`src/lib/queue/instance.ts` **only**. The server/API contract — actions,
`ActionResult`, error codes, validation schemas, and DTOs — is unaffected.
See `docs/CONCURRENCY.md` for the atomicity requirements that come with the
database transition.

## Phase boundaries

```text
Phase 7  Server/API refinement        ← this phase
Phase 8  Realtime
Phase 9  Notifications
Phase 10 Analytics
Phase 11 E2E + security hardening
Phase 12 Prisma + PostgreSQL
```