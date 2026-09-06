# QueueLess — Realtime Architecture (Phase 8)

This document describes how QueueLess keeps client pages in sync with the
queue domain without a production realtime provider, WebSockets, or SSE.

## Design principles

1. **QueueService stays the single business authority.** Positions, ETAs,
   tokens, and state transitions are never computed in realtime or client
   code. A realtime event only says "something changed" → the client
   re-fetches authoritative data via `router.refresh()`. There is no drift:
   the live data path is the same as the first-render path.
2. **Events are best-effort and side-effect-free for the domain.** An event is
   published *after* a successful mutation; a failed mutation emits nothing; a
   failed publish never rolls back or fails the mutation. There is no outbox
   and no distributed transaction — realtime adds zero durability debt.
3. **No WebSocket/SSE infrastructure.** The browser channel is short polling
   over one authorized route handler. When a production realtime provider is
   introduced, only the transport changes; the public contracts do not.
4. **Provider-neutral.** The domain publishes coarse events; the transport
   publishes/subscribes/replays them; the browser subscribes per queue. Every
   seam is an interface with a single in-memory implementation today.

## Event model — `src/lib/realtime/events.ts`

Three event types, deliberately coarse. None carries computed state.

| Event | Published after | Shape |
| --- | --- | --- |
| `QUEUE_UPDATED` | `joinQueue`, `addWalkIn`, `callNextPatient`, `cancelQueueEntry` | `{ id, type, occurredAt, queueId, sequence }` |
| `QUEUE_ENTRY_UPDATED` | `startConsultation`, `completeConsultation`, `markNoShow` | `{ id, type, occurredAt, queueId, entryId, sequence }` |
| `QUEUE_STATUS_CHANGED` | `pauseQueue`, `resumeQueue` | `{ id, type, occurredAt, queueId, sequence }` |

An event carries `id` (uuid), `occurredAt` (ISO), and `sequence` (stamped by
the transport — see Ordering). `createRealtimeEvent` builds the correct shape
and rejects `QUEUE_ENTRY_UPDATED` without an `entryId`.

## Topics — `src/lib/realtime/topics.ts`

One stream per queue: `queue:<queueId>`. Every subscriber for a queue sees
every event for that queue regardless of type. `queueTopic`,
`parseQueueTopic`, `isQueueTopic` are the helpers.

## Transport — `src/lib/realtime/transport.ts`

```ts
interface RealtimeTransport {
  publish(topic, event): Promise<QueueRealtimeEvent>;  // stamps sequence, stores, notifies listeners
  subscribe(topic, listener): RealtimeSubscription;    // per-topic listener sets
  readEvents(topic, afterSequence): Promise<QueueRealtimeEvent[]>; // cursor replay
}
```

`InMemoryRealtimeTransport` (`src/lib/realtime/in-memory-transport.ts`) is the
development implementation: per-topic event retention, per-topic listeners,
monotonic process-local sequence counter, and listener-error isolation (a
throwing subscriber never breaks publishing or other subscribers).

A production provider (Supabase Realtime, Redis pub/sub, a broker) implements
the same three operations. **Nothing else in the app changes.**

## Publisher — `src/lib/realtime/publisher.ts`

`QueueEventPublisher.publish(queueId, event)` maps a queue id to its topic via
`createQueuePublisher(transport)`, keeping the queue domain free of topic
semantics. `SafeQueuePublisher` wraps delivery: it swallows publish errors and,
after the first failure, stops attempting (a permanently broken transport can
no longer add latency to every mutation). `isHealthy()` exposes the latch for
observability. The queue service receives the safe publisher.

## Wiring — `src/lib/realtime/instance.ts`

The shared transport and publisher are singletons (parallel to the mock
repository) so state and sequences persist across server requests in one
process. `src/lib/queue/instance.ts` injects the publisher into `QueueService`.

```ts
// Production swap (realtime contributor):
const transport = new RedisRealtimeTransport(redis);
export const realtimePublisher = new SafeQueuePublisher(createQueuePublisher(transport));
```

## Subscription authorization — `src/lib/realtime/authorization.ts`

`canSubscribeToQueue(user, queueId, deps)` is evaluated **server-side on every
poll**. Rules:

| Role | Rule |
| --- | --- |
| STAFF / ADMIN | Any queue. |
| DOCTOR | Only queues they serve: `queue.doctor.displayName === user.name` (the deterministic link available with the mock auth provider). |
| PATIENT | Only while they have an **active** entry (`WAITING | CALLED | IN_CONSULTATION`) in the queue. A patient with only terminal/historical entries has nothing left to stream and is denied. |
| other / unauthenticated | Denied. |

Deps are injected (`getQueueWithDetails`, `getQueueEntries`) so the rule is
pure and independently testable.

## Polling endpoint — `src/app/api/realtime/events/route.ts`

`GET /api/realtime/events?queue=<queueId>&after=<sequence>`

Pipeline: parse (zod, `queueIdSchema` + non-negative int `after`) → authenticate
(session cookie) → authorize (`canSubscribeToQueue`) → read events after the
cursor → respond with the Phase 7 envelope.

```jsonc
// 200
{ "success": true, "data": { "events": [...], "latestSequence": 5 } }

// 400 / 401 / 403
{ "success": false, "error": { "code": "VALIDATION_ERROR|UNAUTHENTICATED|FORBIDDEN", "message": "..." } }
```

The client advances `after` to `latestSequence` and reaches the live tail.
Events are never served for queues the session may not observe; no computed
state is ever serialized.

## Client synchronization — `src/lib/realtime/polling-client.ts`, `use-realtime.ts`

- `createRealtimePoller(deps)` — DOM-free polling loop: immediate poll on
  start, then every `intervalMs` (default 3000ms). The cursor advances from the
  server's `latestSequence` (defensively clamped to the max event sequence); a
  failed poll flips the status to `unavailable` without aborting (next tick
  retries); `stop()` clears the timer and ignores in-flight results. Tested
  standalone with fake timers.
- `pollQueueEvents(queueId, after, fetchFn)` — the HTTP call with an injectable
  `fetch` for tests.
- `useRealtimeUpdate(queueId, opts)` — React bridge: one subscription per
  page/feature boundary; events trigger a single **coalesced** (250ms debounce)
  `router.refresh()`; returns the connection state.

### Connection states
`connecting` → `live` → (`unavailable` on failure, retries on next tick).

## UI integration

- `RealtimeStatus` (`src/components/realtime/realtime-status.tsx`) — subtle,
  non-intrusive status pill (Live / Connecting… / Updates unavailable).
- `QueueRealtimeSync` — silent subscriber + status pill used by server-rendered
  patient pages.
- Mounted at feature boundaries (one subscription each):
  - `StaffDashboard`, `DoctorDashboard` → `useRealtimeUpdate(selectedQueueId)`.
  - `/queue/[queueId]` (overview), `/queue/[queueId]/status` (WAITING /
    CALLED / IN_CONSULTATION states) → `QueueRealtimeSync`.

All target pages are `force-dynamic`, so `router.refresh()` re-runs the same
read path used on first render — there is no duplicate data flow.

## Ordering & limitations (in-memory transport)

- Sequence is a single process-local counter; ordering and replay are only
  guaranteed within **one Node process**. Cross-process/load-balanced
  deployments need a provider with its own ordering and catch-up semantics.
- Events are not durable: a process restart clears the stream. Clients recover
  by falling back to normal page renders; the non-realtime path is unchanged
  and always works.
- Long-polling is intentionally not used; the 3s poll + refresh is the
  documented demo behavior.

## Tests — `tests/realtime/`

| File | Coverage |
| --- | --- |
| `events.test.ts` | event factory shapes, entryId requirement, defaults, topics |
| `transport.test.ts` | publish/sequence, readEvents cursors, per-topic delivery, unsubscribe, listener-error isolation |
| `authorization.test.ts` | role matrix over real mock data + terminal-entry edge case |
| `mutations.test.ts` | event emission per mutation, failure ⇒ no event, optional publisher, throwing-publisher resilience via `SafeQueuePublisher` |
| `polling-client.test.ts` | immediate + interval polls, cursor advance, empty-poll silence, failure→recovery, stop/restart, in-flight-after-stop |
| `events-route.test.ts` | 400/401/403/200 contract incl. patient/doctor authorization |

## Handoff (realtime contributor)

1. Implement `RealtimeTransport` over the chosen provider (publish/subscribe/
   readEvents-after-cursor).
2. Construct it in `src/lib/realtime/instance.ts`; keep the `SafeQueuePublisher`.
3. No changes needed in `QueueService`, event model, authorization, the client,
   or any UI.