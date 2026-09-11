# QueueLess Database Schema

## Entities

| Model | Purpose | Important relationships |
| --- | --- | --- |
| `Clinic` | Healthcare facility | Has users, patients, departments, and queues |
| `User` | Login identity and role | Belongs to a clinic; may be a doctor; owns notifications |
| `Patient` | Patient profile | Belongs to a clinic; owns queue entries |
| `Department` | Clinic department | Belongs to a clinic; has doctors and queues |
| `Doctor` | Queue clinician | Belongs to a department and optional user; has queues |
| `Queue` | Doctor's queue for a date | Belongs to clinic, department, and doctor; has entries and events |
| `QueueEntry` | Patient's queue visit | Belongs to queue and patient; has events and notifications |
| `QueueEvent` | Immutable domain/audit event | Belongs to queue; optionally references entry and actor |
| `Notification` | In-app notification | Belongs to user; optionally references queue and entry |

`Patient` is included because queue entries need a durable patient profile even
though the original Phase 12 entity list focused on operational models.

## State fields

`Queue.status` stores `NOT_STARTED`, `ACTIVE`, `PAUSED`, `COMPLETED`, or
`CANCELLED`.

`QueueEntry.status` stores `REGISTERED`, `WAITING`, `CALLED`,
`IN_CONSULTATION`, `COMPLETED`, `NO_SHOW`, or `CANCELLED`.

Entry timestamps preserve the lifecycle: `joinedAt`, `calledAt`,
`consultationStartedAt`, `completedAt`, and `cancelledAt`. Queue timestamps
preserve `startedAt`, `pausedAt`, and `endedAt`.

`position` and ETA are deliberately absent from the schema. QueueService
calculates them from current entries and doctor consultation averages.

## Constraints and indexes

- Primary keys are stable string IDs.
- User email is unique.
- Queue entry token numbers are unique within a queue.
- Queue and entry status values are checked against the domain enums.
- Notification event and generated-notification deduplication use unique
  composite constraints.
- Queue, entry, event, notification ownership, and user relationships use
  foreign keys.
- Query indexes cover queue/date, queue/status, patient, event timeline, and
  notification user/read state access patterns.

## Migrations

The migration graph contains a baseline for the operational schema and a
notification migration. Migrations are generated from the Prisma contract and
applied to Supabase PostgreSQL; application tables must not be manually
created in Supabase.

## Environment

Only `DATABASE_URL` is required by the runtime:

```env
DATABASE_URL="postgresql://...supabase..."
```

`.env` is local-only and must never be committed. Use a Supabase PostgreSQL
connection string supplied by the deployment environment.
