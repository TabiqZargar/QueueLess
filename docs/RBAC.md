# Role-Based Access Control

Roles are the single source of truth for authorization. They are centralized in
`src/lib/auth/roles.ts` (`USER_ROLES`) and their type in `src/types` —
application code references the constants instead of scattering literal role
strings. No role is ever accepted from the client; every protected operation
validates the caller server-side.

## Roles

| Role    | Constant / value | Who they are                                   |
| ------- | ---------------- | ---------------------------------------------- |
| Patient | `USER_ROLES.PATIENT` | People waiting in or joining a queue        |
| Staff   | `USER_ROLES.STAFF`   | Clinic reception / queue operators          |
| Doctor  | `USER_ROLES.DOCTOR`  | Clinicians performing consultations         |
| Admin   | `USER_ROLES.ADMIN`   | System / clinic administration               |

## Permission matrix

| Capability                        | Patient | Staff | Doctor | Admin |
| --------------------------------- | ------- | ----- | ------ | ----- |
| Browse / view a queue overview    | ✓       | ✓     | ✓      | ✓     |
| Join a queue                      | ✓       | –     | –      | –     |
| View own queue status             | ✓       | –     | –      | –     |
| Cancel own queue entry            | ✓ (ownership) | – | –    | –     |
| Staff dashboard (`/staff/dashboard`) | –    | ✓     | –      | –     |
| Call next patient                 | –       | ✓     | –      | –     |
| Add walk-in                       | –       | ✓     | –      | –     |
| Pause / resume queue              | –       | ✓     | –      | –     |
| Mark patient no-show              | –       | ✓     | –      | –     |
| Cancel queue entry (staff)        | –       | ✓     | –      | –     |
| Doctor dashboard (`/doctor/dashboard`) | – | –   | ✓      | –     |
| Start consultation                | –       | –     | ✓      | –     |
| Complete consultation             | –       | –     | ✓      | –     |
| Admin dashboard (`/admin`)        | –       | –     | –      | ✓     |

Notes:

- **Start/complete consultation** are DOCTOR-only. When Phase 5 split the
  consultation experience into the doctor dashboard, consultation state
  changes became the doctor's responsibility; the staff current-patient panel
  no longer offers them (it keeps call-next and no-show, which remain STAFF).
- Ownership rules apply in addition to roles: cancellation requires the entry
  to belong to the signed-in user.
- Admins do **not** implicitly inherit business permissions (e.g. an Admin
  cannot operate a queue) so administration can never bypass queue rules.

## Enforcement points

| Layer                    | Mechanism                                   | Where                                             |
| ------------------------ | ------------------------------------------- | ------------------------------------------------- |
| Routes (pages)           | `guardPage(roles, path)` in route-group layouts; signed-out → `/login?next=`, wrong role → `Forbidden` screen | `src/lib/auth/page-guard.ts`, `(staff|doctor|admin)/layout.tsx` |
| Server actions           | `requireRole(...)` at top of each action    | `src/features/{staff,doctor,patients}/...actions` |
| Object-level ownership   | `ensureOwnership(userId, ownerId)`          | `src/features/patients/queue-actions.ts`          |
| Home navigation          | Role-aware links (Admin link only for ADMIN) | `src/app/page.tsx`                                |

## Server-action roles in code

- `src/features/staff/actions.ts` — `callNextPatientAction`,
  `markNoShowAction`, `cancelEntryAction`, `addWalkInAction`,
  `pauseQueueAction`, `resumeQueueAction` → `requireRole(USER_ROLES.STAFF)`.
- `src/features/doctor/actions.ts` — `startConsultationAction`,
  `completeConsultationAction` → `requireRole(USER_ROLES.DOCTOR)`.
- `src/features/patients/queue-actions.ts` — `joinQueueAction`,
  `cancelQueueEntryAction` → `requireRole(USER_ROLES.PATIENT)`; cancel also
  calls `ensureOwnership(user.id, entry.patientId)`.

## Error semantics

- Wrong role on a page → `Forbidden` component (403 semantics) or redirect to
  login when signed out (401).
- Wrong role on a server action → `AuthorizationError` → mapped user message
  (`"You are not authorized to perform this action."`).
- No session on a server action → `AuthenticationError` →
  `"Please sign in to continue."`.

## Development policy decisions

- The development login page lets the tester choose a role
  (Patient/Staff/Doctor/Admin). This is a mock conveninence only; a real
  provider determines roles from real user data.
- `/join` and queue-status pages remain publicly viewable (the status page is
  scoped to the patient's entry cookie). The join *action* is
  PATIENT-gated, which is the product rule that matters.

## Database handoff

The permission model itself does not change when persistence lands, but the
real system must:

1. Store role per user in the database and derive it server-side.
2. Enforce ownership with authoritative user ids (e.g. `WHERE id = :userId`
   instead of trusting the client), including cancellation.
3. Enforce consultation transitions at the data layer the same way
   `QueueService` does today, and keep role checks ahead of those calls.

## Tests

`tests/auth/rbac-actions.test.ts` verifies the matrix directly against the
real server actions: each cross-role denial (PATIENT/DOCTOR/ADMIN calling
staff actions, PATIENT/STAFF calling doctor actions, non-patients joining
queues), the allowed path for each role, and Patient-A-cannot-cancel-Patient-B
ownership.