# Authentication

This document describes how authentication works in QueueLess during the
pre-database development phase, what is deliberately mocked, and exactly what
the database contributor needs to replace.

## Current state: development-only mock auth

There is **no real user store yet**. Authentication is a deterministic
development mechanism:

- A small, hard-coded user set lives in `src/lib/auth/mock-auth.ts`.
- A session is an **HTTP-only, SameSite cookie** (`queueless_session`) that
  stores only a user id, e.g. `user:patient-1`.
- Every request resolves the id through the mock provider. The client never
  holds role or identity data it can trust - it is only re-injected server-side.

The mock users and the login roles they map to:

| Login button   | User id      | Name               | Email                  | Role    |
| -------------- | ------------ | ------------------ | ---------------------- | ------- |
| Patient        | `patient-1`  | Muhammad Hassan    | patient@example.com    | PATIENT |
| Staff          | `user-staff` | Staff Operator     | staff@example.com      | STAFF   |
| Doctor         | `user-doctor`| Dr. Ahmed Khan     | doctor@example.com     | DOCTOR  |
| Admin          | `user-admin` | System Administrator | admin@example.com    | ADMIN   |

The PATIENT user id deliberately matches the seeded mock patient `patient-1`
so queue-entry ownership checks work end to end.

> All credentials are development-only. The login page marks itself as such.

## Auth API

Server-only helpers - never imported from client components. All in
`src/lib/auth` (re-exported through `src/lib/auth/index.ts`):

| Function            | Behaviour                                                             |
| ------------------- | -------------------------------------------------------------------- |
| `getSession()`      | Resolves the current `Session \| null` from request cookies          |
| `getCurrentUser()`  | Returns `AuthUser \| null`                                            |
| `requireUser()`     | Returns the user or throws `AuthenticationError`                     |
| `requireRole(role)` | Returns the user or throws `AuthorizationError` if roles mismatch    |
| `requireAnyRole([...])` | User, or `AuthorizationError` if not in the set                  |
| `ensureOwnership(userId, ownerId)` | Throws `AuthorizationError` if identifiers differ     |

`AuthenticationError` (no session / signed out → 401 semantics) and
`AuthorizationError` (signed in but not permitted → 403 semantics) are
distinct error types in `src/lib/auth/errors.ts`. They are mapped to safe,
human-readable messages by `toActionErrorMessage` in
`src/lib/queue/action-error.ts` - no stack traces or internals reach the UI.

## Session cookie

- Name: `queueless_session`
- Value: `user:<userId>` (opaque id, resolved server-side)
- Flags: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 7-day max-age.

The value is set and deleted by the development login/logout actions
(`src/features/auth/actions.ts`). Route guard redirects preserve the original
destination via `?next=`:

```
GET /staff/dashboard (logged out)
  -> 307 /login?next=%2Fstaff%2Fdashboard
```

## How authentication is enforced

Auth is enforced server-side at three layers; the client only ever displays
server results:

1. **Route protection (server components).** `guardPage(roles, path)` in
   `src/lib/auth/page-guard.ts` is called from the route-group layouts:

   | Route               | Required role | Layout                         |
   | ------------------- | ------------- | ------------------------------ |
   | `/staff/dashboard`  | STAFF         | `src/app/(staff)/layout.tsx`   |
   | `/doctor/dashboard` | DOCTOR        | `src/app/(doctor)/layout.tsx`  |
   | `/admin`, `/admin/dashboard` | ADMIN | `src/app/(admin)/layout.tsx` |

   Signed-out → redirect to `/login?next=<path>`. Wrong role → a dedicated
   `Forbidden` screen (`src/components/forbidden.tsx`) - never an empty
   dashboard. Middleware is intentionally **not** used: page-level guards
   cover every route and share the same `getCurrentUser` resolution as
   actions, keeping one authoritative path (and one that's directly testable).

2. **Server-action RBAC.** Every mutating server action calls
   `requireRole(...)` at its top:

   - `src/features/staff/actions.ts` → `requireRole(STAFF)`
     (call next, mark no-show, cancel entry, add walk-in, pause/resume).
   - `src/features/doctor/actions.ts` → `requireRole(DOCTOR)`
     (start/complete consultation).
   - `src/features/patients/queue-actions.ts` → `requireRole(PATIENT)`
     (join queue, cancel own entry) plus `ensureOwnership` on cancel.

   Calling a role-gated action with the wrong role returns the mapped
   `error` message; the operation is never performed.

3. **Ownership.** `cancelQueueEntryAction` verifies the queue entry belongs to
   the signed-in user before cancelling (`entry.patientId === user.id`).

## Patient join flow

Joining a queue now requires a signed-in PATIENT. The authenticated user's id
becomes the patient id for the queue entry (`getOrCreatePatientForUser` in
`src/features/patients/patient-store.ts`), so ownership checks work. The
public `/join` page shows a sign-in prompt for logged-out visitors; the
server action itself enforces the rule regardless of UI.

The `/queue/[queueId]/status` page remains public but is scoped to the
patient's entry cookie (`queueless_entry`), which is set when they join.

## Security properties

- Role is **never** accepted from the client as an arbitrary value: the login
  action validates the submitted role against a fixed allowlist and maps it to
  a server-known dev user.
- No tokens in `localStorage`/`sessionStorage`; the session cookie is
  HTTP-only so JS cannot read it.
- Redirect destinations are sanitized (`sanitizeRedirectPath`) to prevent
  open redirects.
- Wrong-role access is denied at the server, not merely hidden in the UI.

## What the database contributor replaces

Swap `src/lib/auth/mock-auth.ts` and `src/lib/auth/session.ts` for a real
provider; everything above the auth API surface keeps working:

1. Replace `mockAuthUsers` with users from the real store, keeping
   `AuthUser { id, name, role }`.
2. Replace the cookie session with real session handling (or the ORM's
   session table). Keep it an **HTTP-only** cookie or server-side session.
3. Persist the patient/user link explicitly: queue entries must reference the
   authenticated user id, and `ensureOwnership`/cancellation must be enforced
   at the database layer with authoritative user ids (never from form input).
4. Remove the development role-selection login page once real login exists.

## Testing

`tests/auth/auth-session.test.ts` covers session resolution and the
authorization helpers (including the AuthenticationError vs AuthorizationError
distinction). `tests/auth/rbac-actions.test.ts` exercises the real login/logout
actions and the actual role-gated server actions (denied patient/staff/admin
calls, allowed role calls, and ownership: Patient A cannot cancel Patient B),
with `next/headers` and `next/navigation` mocked and module state reset per
test.