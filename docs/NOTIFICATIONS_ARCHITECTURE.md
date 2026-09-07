# QueueLess — Notifications Architecture (Phase 9)

This document describes the in-app notification domain: how queue events become
patient notifications, what is deliberately *not* implemented, and how a
production database / external-channel contributor replaces the mock pieces.

## Principles

1. **Notifications are a side effect of domain events, not of the UI.** A
   notification is created only from a *stored* queue event, which exists only
   after a successful queue mutation. A failed mutation therefore never produces
   a notification, and notification code never runs in a React component.
2. **QueueService stays the single business authority.** Notification code never
   re-computes positions or ETAs: it reads `QueueService.getQueuePosition` for
   TURN_APPROACHING decisions. Realtime events only tell the UI "something
   changed"; the notification pipeline is what materializes records.
3. **Failure isolation.** The notification pipeline can fail without failing or
   rolling back the queue mutation (the same guarantee realtime has in Phase 8).
4. **Provider- and framework-neutral.** The domain knows nothing about React,
   Next.js, the browser, Prisma, or external channels. Every seam is an
   interface with one in-memory implementation today.
5. **Best-effort, no loops.** Notification processing creates no queue events and
   no realtime events. A mutation emits exactly one realtime event regardless of
   how many notifications it produced.

## Flow

```text
Queue mutation (QueueService)
   ↓ repository.addQueueEvent → stored QueueEvent (id + timestamp)
   ↓ notification handler (injected into QueueService)
NotificationPolicy.evaluate(event)  → NotificationIntent[]
   ↓ per intent
NotificationService.createNotification(...)   (IN_APP, deduplicated)
   ↓
InAppNotificationDelivery.deliver(...)   (no-op today)
   ↓
Patient UI reads via getPatientNotifications → server actions
```

Wiring: `src/lib/queue/instance.ts` constructs `QueueService`, then
`createNotificationHandler(() => queueServiceRef)` (from
`src/lib/notifications/instance.ts`) builds the policy/service/delivery
pipeline over lazy closures. The lazy getter avoids a circular import between
the two singleton files.

## Types — `src/lib/notifications/types.ts`

`NotificationType`: `QUEUE_JOINED`, `TURN_APPROACHING`, `PATIENT_CALLED`,
`CONSULTATION_STARTED`, `QUEUE_PAUSED`, `QUEUE_RESUMED`, `NO_SHOW`, plus the
forward-compatible `QUEUE_COMPLETED` and `QUEUE_CANCELLED` (no queue flow
currently produces them; the policy returns nothing for them).

`NotificationChannel`: `IN_APP | EMAIL | SMS | PUSH`. Only `IN_APP` is
implemented; the remainder are reserved for future providers.

`Notification` model (stored): `id, userId, type, title, message, channel,
queueId?, entryId?, eventId?, dedupeKey?, createdAt (ISO), readAt (ISO | null)`.
Relational fields such as `queueId`/`entryId` are optional because queue-level
notifications (pause/resume) have no entry, and entry-level ones do. The model
never carries phones, medical data, or tokens.

`NotificationSummary` (DTO to the UI): `id, type, title, message, createdAt,
readAt`. `userId` and all relational fields stay server-side.

## Decision layer — `src/lib/notifications/policy.ts`

`NotificationPolicy.evaluate(QueueEvent)` is the single place that maps domain
events to notifications. Rules:

| Queue event | Notification |
| --- | --- |
| `QUEUE_JOINED` | to the joined patient (`QUEUE_JOINED`, token + doctor name) |
| `PATIENT_CALLED` | to the called patient (`PATIENT_CALLED`, token) |
| `CONSULTATION_STARTED` | to the patient being served (`CONSULTATION_STARTED`, token) |
| `PATIENT_NO_SHOW` | to the affected patient (`NO_SHOW`) |
| `QUEUE_PAUSED` / `QUEUE_RESUMED` | to every patient with an **active** entry (WAITING/CALLED/IN_CONSULTATION) |
| `CONSULTATION_COMPLETED` | no direct notification (but bubbles positions) |
| `PATIENT_CANCELLED` | no notification — patients are never notified of their own cancel |
| `QUEUE_CREATED`, `WALK_IN_ADDED`, `DOCTOR_DELAYED`, `QUEUE_COMPLETED`, `QUEUE_CANCELLED` | nothing |
| *any failed mutation* | nothing (event is never stored) |

### TURN_APPROACHING

- Evaluated after "bubble" events that can shift WAITING positions:
  `QUEUE_JOINED`, `PATIENT_CALLED`, `CONSULTATION_STARTED`,
  `CONSULTATION_COMPLETED`, `PATIENT_NO_SHOW`, `PATIENT_CANCELLED`.
- For each WAITING entry, patients-ahead comes **only** from the authoritative
  `QueueService.getQueuePosition` (single patient at a time; a missing entry is
  skipped, never thrown). Ahead counts are never recomputed in notification
  code.
- Notification fires once per entry when `1 ≤ patientsAhead ≤ threshold`
  (default **2**, injectable via `turnApproachingThreshold`). Deduplication uses
  `dedupeKey = turn-approaching:<queueId>:<entryId>`, so an entry is notified
  the first time it enters the window and not again as it approaches further.
- There is no ML/ETA modeling; the notification only says positions shifted.

## Repository — `src/lib/notifications/repository.ts`

Minimal contract parallel to `QueueRepository`:

```ts
interface NotificationRepository {
  create(input): Promise<Notification>;
  listByUser(userId): Promise<Notification[]>;
  countUnreadByUser(userId): Promise<number>;
  markAsRead(notificationId, userId): Promise<Notification | null>;
  markAllAsRead(userId): Promise<number>;
}
```

Every read is userId-scoped; ownership is enforced at the persistence layer.
`MockNotificationRepository` implements deterministic, process-local dedup:
`create` returns the existing notification when the same `(userId, type)` has
the same `eventId` (one-to-one event→notification) or the same `dedupeKey`
(generated). A real database repository replaces the mock with a unique
constraint and cross-process guarantees (see Handoff).

## Service — `src/lib/notifications/service.ts`

`NotificationService` is provider-independent: `createNotification`,
`getNotifications` (→ summaries), `getUnreadCount`, `markAsRead` (scoped,
idempotent for missing / not-owned ids), `markAllAsRead`. It knows nothing
about React, Next.js, cookies, or Prisma.

## Delivery — `src/lib/notifications/delivery.ts`

`NotificationDelivery.deliver(notification)` is the seam for future channels.
`InAppNotificationDelivery` is a no-op because the notification is already
stored and the UI reads it back through the standard read path. Email/SMS/push
contributors implement this interface (and wire the respective repository /
outbox) without touching the policy or the queue service.

## Event handler — `src/lib/notifications/event-handler.ts`

- `QueueEventNotificationHandler` runs policy → creates → delivers per intent,
  with **per-intent isolation** (one failing intent skips only that intent).
- `SafeNotificationHandler` adds the Phase 8-style latch: after the first
  unexpected failure it stops being called so a permanently broken pipeline
  cannot add latency to every mutation; a notification failure never fails or
  rolls back the queue mutation (`isHealthy()` exposes the latch). The
  application wires the safe wrapper, matching `SafeQueuePublisher`.

## Server entry points

Reads use server-side data flow; mutations are server actions. There are no new
REST routes (per Phase 7 policy, API routes exist only for non-browser
consumers).

- `getPatientNotifications(user)` — `src/features/notifications/get-notifications.ts`.
  `requireRole(PATIENT)` guard; documents are strictly the DTO above. The
  patient layout (`src/app/(patient)/layout.tsx`) calls it once per render and
  passes the result to the bell.
- `markNotificationAsReadAction(notificationId)` /
  `markAllNotificationsAsReadAction()` — `src/features/notifications/actions.ts`.
  Pipeline: authenticate → authorize (PATIENT only) → validate
  (`notificationIdSchema`) → service → `ActionResult`. The user id always comes
  from the session; the client can never target another user's rows. Marking a
  missing or not-owned id resolves to an idempotent success (no
  `NOTIFICATION_NOT_FOUND`).

No `NOTIFICATION_NOT_FOUND` error code is added; the existing `ErrorCode` set
covers everything notifications need.

## UI — patient notification bell

- `NotificationBell` (`src/features/notifications/notification-bell.tsx`) is a
  client component in the patient header: bell button, unread badge
  (`aria-label` includes the unread count, a visible badge for sighted users),
  Escape/outside-click to close, and "Mark as read" / "Mark all as read"
  controls that call the actions and then `router.refresh()`.
- Empty state renders **"No notifications yet."**
- Time strings are computed server-side from `createdAt` (deterministic SSR, no
  hydration mismatch); absolute time is available via title tooltip.
- Realtime integration: the bell is re-rendered by the existing queue-event
  refresh path (the same `router.refresh()` a realtime poll triggers), so a new
  notification becomes visible alongside the next live update. Polling and
  realtime **never create notifications**; a notification never triggers a
  queue/realtime event (no loops — verified by tests).
- Pages that do not subscribe to realtime (e.g. `/join`) show new notifications
  on the next navigation; that is a documented MVP limitation, not a second
  realtime system.
- No staff/doctor/admin notification center is built; the service remains
  role-ready by keeping `NotificationService` unaware of roles.

## Security boundaries

- Only authenticated, PATIENT-role sessions can read or mutate notifications;
  staff, doctors and admins are denied (throwing `requireRole`).
- Ownership: the session user id is the only key accepted; a notification
  belongs to exactly one user and every read/`markAsRead` is userId-scoped.
- DTO minimization: `NotificationSummary` never contains `userId`, `entryId`,
  `queueId`, patient names, or phones.
- Logs and error messages are safe: no tokens, sessions, phone numbers, or
  stack traces reach the browser. The event handler catches and isolates errors
  without logging sensitive data.

## Deduplication & correctness

| Concern | Behavior |
| --- | --- |
| Same event delivered twice (retry/dup event) | `create` returns the existing row for `(userId, type, eventId)` |
| Generated notification re-evaluated | `(userId, type, dedupeKey)` returns the existing row |
| Multiple active entries per user (pause/resume) | one notification per user — same `eventId` dedup |
| Cross-process / restart correctness | not guaranteed by the mock; see Handoff |
| Failed mutation / invalid transition | no event stored → no notification |

## Ordering & limitations (in-memory)

- Notifications are process-local: a process restart clears them, exactly like
  `MockQueueRepository` and the realtime transport.
- The unread badge reflects the last server render; realtime keeps the queue
  view fresh and the bell follows the same refresh cadence.
- No retention/deletion, no preferences UI, no persistence of per-channel
  settings — all future concerns, none modeled or implemented.

## Tests — `tests/notifications/`

| File | Coverage |
| --- | --- |
| `domain.test.ts` | create/list/unread/mark-read/all, user scoping, empty list, DTO keys, dedup by eventId and dedupeKey, distinct-by-type/event, seeded repo |
| `policy.test.ts` | event→intent mapping, no-notify events, pause/resume active-entry scope, TURN_APPROACHING window/threshold, authoritative-position check |
| `integration.test.ts` | full wiring: join/call/consultation/no-show notifications, pause/resume fan-out, no self-cancel notification, no notification on failed mutation, TURN via real QueueService, exactly-one-realtime-event, broken-pipeline isolation, safe-handler latch |
| `actions.test.ts` | RBAC (anonymous/staff/doctor denied, patient allowed), VALIDATION_ERROR on bad id, idempotent mark-read, mark-all, read DTO |

## Database handoff (Phase 12+)

The notifications contributor implements `NotificationRepository` over
Prisma/PostgreSQL and swaps it in `src/lib/notifications/instance.ts` (the same
single-place pattern as the queue repository). Recommended schema (not
finalized; a migration is authored by the database contributor):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text/`gen_random_uuid()` | PK |
| `userId` | — | FK to users; indexed with `createdAt` |
| `type` | text | `NotificationType` |
| `title`, `message` | text | display copy |
| `channel` | text | `IN_APP` today |
| `queueId`, `entryId` | — | nullable FKs |
| `eventId` | — | nullable; **unique constraint target** |
| `dedupeKey` | text | nullable; unique with `(userId, type)` |
| `createdAt` | timestamptz | default now() |
| `readAt` | timestamptz | null = unread |

Candidate indexes: `(userId, createdAt desc)`, `(userId, readAt)`, and the
dedup unique constraint `(userId, type, eventId)` / `(userId, type, dedupeKey)`.

Cross-process dedup relies on those constraints once a shared database exists.
If external channels arrive, `NotificationDelivery` gains real
implementations (SMS/email/push providers) plus an outbox/queue to keep delivery
atomic relative to event persistence — none of which changes the policy, the
service, or the UI contract. `NotificationPreferences` (opted-out channels,
quiet hours) is a separate future feature; the policy is already separated so it
can consult preferences without touching delivery.

## Phase boundaries respected

No Prisma/PostgreSQL/Supabase, no Redis/Kafka/job queues, no SMS/email/push
providers, no Firebase/OneSignal/Twilio/SendGrid, no analytics/ML, no analytics
of notification views, no retention scheduling, no notification center for
staff/doctors, and nothing from Phase 10+.