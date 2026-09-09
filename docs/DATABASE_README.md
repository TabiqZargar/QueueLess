# QueueLess — Database README

## 1. Purpose

The database layer persists QueueLess state in a durable, shared PostgreSQL
database. Today the application runs on in-memory mock repositories; the goal
of the database milestone is to keep the application behavior identical while
replacing the mocks with a database-backed implementation behind the same
repository interfaces.

## 2. Stack

| Component | Role |
| --- | --- |
| PostgreSQL | Relational database |
| Supabase | PostgreSQL hosting and cloud tooling |
| Prisma | ORM: schema source of truth, migrations, client generation, seeding |

## 3. Architecture

```text
UI
 ↓
Server Actions
 ↓
Auth / RBAC / Validation
 ↓
QueueService / NotificationService
 ↓
Repository Interface
 ↓
Prisma Repository
 ↓
Supabase PostgreSQL
```

`QueueService` and `NotificationService` never talk to the database directly.
They depend on the existing repository contracts
(`QueueRepository`, `NotificationRepository`). A future Prisma repository
implements those contracts against PostgreSQL; swapping it in is a single
wiring change in the singleton modules, identical to how the mock repositories
are wired today.

## 4. Main entities

The Prisma schema mirrors the domain models in `src/types` and
`src/lib/notifications/types.ts`:

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `User` | Application user / login identity | `id`, `name`, `email`, `phone?`, `role`, `clinicId`, timestamps |
| `Clinic` | Healthcare facility | `id`, `name`, `address`, `contact`, `timezone`, timestamps |
| `Department` | Clinic department | `id`, `clinicId`, `name`, `status` (ACTIVE/INACTIVE) |
| `Doctor` | Clinician running a queue | `id`, `userId?`, `displayName`, `departmentId`, `status`, `averageConsultationMinutes` |
| `Queue` | A day's queue for a doctor | `id`, `clinicId`, `departmentId`, `doctorId`, `queueDate`, `status`, `currentToken`, started/paused/ended at |
| `QueueEntry` | A patient's place in a queue | `id`, `queueId`, `patientId`, `tokenNumber`, `entryType`, `status`, joined/called/consultation/completed/cancelled timestamps |
| `QueueEvent` | Immutable audit/domain events | `id`, `queueId`, `queueEntryId?`, `actorUserId?`, `eventType`, `timestamp`, `metadata?` |
| `Notification` | In-app notifications for patients | `id`, `userId`, `type`, `title`, `message`, `channel`, `queueId?`, `entryId?`, `eventId?`, `dedupeKey?`, `createdAt`, `readAt` |

`Patient` (notifications of clinic patients) is a related domain model and is
mapped alongside the entities above.

## 5. Queue and entry states

Queue status (`QueueStatus`):

```text
NOT_STARTED → ACTIVE ⇄ PAUSED → COMPLETED | CANCELLED
```

Queue entry status (`QueueEntryStatus`):

```text
REGISTERED → WAITING → CALLED → IN_CONSULTATION → COMPLETED
                        ↓                      ↓
                    (NO_SHOW)            (CANCELLED)
```

Transitions are enforced by the existing state machine
(`src/lib/queue/state-machine.ts`); the database stores statuses but does not
re-derive business rules.

## 6. Rules

- **Position and ETA are derived by `QueueService`**, never recomputed inside
  the repository or by hand-written SQL. The database stores only the raw state
  the domain layer needs.
- **At most one patient may be `CALLED` or `IN_CONSULTATION`** per queue.
- **Race-sensitive operations** (calling the next patient, marking no-show,
  completing consultation, joining when positions are tight) must use database
  transactions, conditional updates, or appropriate locking so concurrent
  requests cannot violate invariants.
- **Repository interfaces remain the application boundary.** Pages, actions,
  and services keep depending on the existing repository interfaces; the Prisma
  implementation must satisfy those contracts without changing the domain code.

## 7. Environment setup

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="your-supabase-postgresql-connection-string"
```

Use the Supabase connection string (Pooler or direct, per environment). Never
commit real credentials.

## 8. Prisma commands

```bash
npx prisma generate     # generate the Prisma client from the schema
npx prisma migrate dev  # create and apply a migration from schema changes
npx prisma db seed      # run the database seed script
npx prisma studio       # open a browser UI to inspect the database
```

## 9. Database development rules

- The Prisma schema is the source of truth for the database shape.
- Prisma migrations create and evolve the database schema.
- Do not manually create or alter application tables in the Supabase dashboard.
- Do not introduce Supabase Auth, Supabase Realtime, Redis, Kafka, Firebase,
  MongoDB, or external notification providers during this phase. Supabase is
  used only as PostgreSQL hosting.

## 10. Testing

Run the standard verification pipeline:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The test suite runs against the in-memory mock repositories and must remain
green while the database layer is added.

## 11. Security

- Never commit `.env` (it is git-ignored).
- Never commit database passwords, API keys, tokens, or Supabase secrets.
- Keep secrets in `.env` / Supabase dashboard permissions; use destination env
  and secret vaults in CI. The existing session/RBAC tests must stay green.

## 12. Current project status

- Phases 1–9 complete (auth/RBAC, queue domain, server actions, realtime,
  notifications).
- Database integration is the current milestone; no database code exists in the
  repository yet — this document describes the target architecture.
- Out of scope for the current milestone (and future phases unless explicitly
  planned): analytics, ML, production authentication, and external notification
  providers.