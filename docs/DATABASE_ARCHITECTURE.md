# QueueLess Database Architecture

## Runtime flow

```text
UI
 ↓
Server Actions
 ↓
Auth / RBAC / Validation
 ↓
QueueService / NotificationService
 ↓
Repository interfaces
 ↓
Prisma repositories
 ↓
Supabase PostgreSQL
```

The application uses Prisma Next (`@prisma/orm-postgres`) with `DATABASE_URL` as
its only database connection configuration. Supabase is PostgreSQL hosting; the
application does not use Supabase Auth, Supabase Realtime, Redis, Kafka, or
Firebase.

`prisma/schema.prisma` is the contract source. Prisma emits the contract
artifacts under `prisma/`, and migrations under `migrations/` create and evolve
the application tables. Application code imports the singleton from
`prisma/db.ts`; it never creates a connection per request.

## Repositories

- `PrismaQueueRepository` implements `QueueRepository`.
- `PrismaNotificationRepository` implements `NotificationRepository`.
- The singleton modules use Prisma when `DATABASE_URL` is configured. Tests and
  local runs without a database URL retain the existing mock repositories so
  unit tests do not require a live database.
- QueueService and NotificationService remain the domain boundaries. DTOs,
  actions, auth/RBAC, notification policy, and realtime publishing are not
  coupled to Prisma.

## Transactions and concurrency

PostgreSQL transactions are used for every database-backed mutation that can
race:

- Joining a queue locks its queue row with `SELECT ... FOR UPDATE`, allocates
  `MAX(tokenNumber) + 1` from the queue entries, and inserts the entry in one
  transaction. `Queue.currentToken` remains the serving-token field used by
  the existing domain.
- Calling the next patient locks the queue row, checks for an existing
  `CALLED` or `IN_CONSULTATION` entry, and conditionally changes the earliest
  `WAITING` entry to `CALLED`.
- Consultation, no-show, cancellation, and queue pause/resume operations lock
  the queue row and update only when the expected previous status still holds.
- Any exception rolls back the transaction. No in-memory lock is used.

The service still owns legal state transitions. The repository owns atomicity
and ensures that only one request can win a race across application instances.

## Notifications

Notification writes are deduplicated by PostgreSQL unique constraints on
`(userId, type, eventId)` and `(userId, type, dedupeKey)`. The repository also
handles a concurrent unique-constraint race by returning the already-created
notification. Reads and read-state mutations are always scoped by `userId`.

## Setup

Create a local `.env` file, which is ignored by Git:

```env
DATABASE_URL="postgresql://...supabase..."
```

Apply migrations with the Prisma 8 migration workflow configured by
`prisma.config.ts`, then seed the database:

```text
npx prisma db migrate
npm run db:seed
```

Never create the application tables manually in the Supabase dashboard and
never commit credentials.

## Restart behavior

State is stored in PostgreSQL, not module memory. Restarting the Next.js
process and reconnecting with the same `DATABASE_URL` reads the same clinics,
queues, entries, events, and notifications. The seed script is idempotent for
its deterministic IDs.
