# QueueLess — Concurrency & Idempotency Handoff

This document captures the concurrency and double-submission requirements that
must be honored when the in-memory mock repository is replaced by a real
database in Phase 12.

## Current state

Today `MockQueueRepository` (in-memory, single Node process) is the only
repository. Within one process its operations are effectively serial, so
cross-instance races cannot occur and the mock cannot faithfully model database
concurrency. This document records what the real repository must guarantee; it
does **not** introduce in-memory locks, queues, or other fake concurrency
controls into the current domain layer.

## Operations that need atomic handling

Every mutation that transitions queue state is susceptible to races when two
requests observe the same "before" state:

```text
callNextPatient
startConsultation
completeConsultation
joinQueue
cancelQueueEntry
pauseQueue
resumeQueue
```

### Canonical race — duplicate "call next"

```text
Request A ──┐
            ├── both read: no active (CALLED/IN_CONSULTATION) patient
Request B ──┘
            ↓
       both attempt to call the next patient
```

Without atomicity the queue ends up with two CALLED patients, violating the
invariant: **at most one CALLED or IN_CONSULTATION patient per queue**.

The current `QueueService` enforces this only by check-then-act inside a single
process (`callNextPatient` reads entries, verifies no active patient, then
updates). That is correct today only because the mock repository serializes and
is never shared across processes.

## Phase 12 database requirement

The Prisma-backed repository must provide, for each state-transition operation:

```text
a transaction (BEGIN/COMMIT/ROLLBACK)
+
a conditional update / row locking / equivalent atomic predicate
```

so that the check and the write are a single atomic step. Concretely:

- **Call next / start / complete / no-show / cancel**: update the entry only if
  its current status still matches the expected "from" state — e.g.
  `UPDATE queue_entries SET status = 'CALLED' WHERE id = ? AND status = 'WAITING'`
  and treat a zero-row result as a lost race (return a domain-correct error).
- **At-most-one-active invariant**: guard `CALLED`/`IN_CONSULTATION` with a
  unique partial index or row-level lock so two concurrent "call next" attempts
  cannot both succeed.
- **Join**: token assignment (`max(token)+1`) must be atomic (sequence, row
  lock on the queue, or equivalent); never read-then-insert without protection.
- **Pause / resume**: status update conditioned on the current status
  (`ACTIVE → PAUSED`, `PAUSED → ACTIVE`), matching the existing state machine.

The domain layer (`QueueService` + `state-machine.ts`) should not need to
change; the repository methods become the enforcement point. The service stays
authoritative about *what* state changes are legal; the database enforces
*-only one request wins*.

## Idempotency / double submission

The UI already disables buttons while a mutation is pending and adds explicit
confirmation dialogs before destructive actions (cancel entry, mark no-show).
The actionable defense-in-depth is **state validation in the service**: every
transition requires a valid "from → to" edge, so a repeated submission lands on
a terminal/invalid state and fails with `INVALID_QUEUE_STATE` instead of
corrupting data.

A full distributed idempotency-key system is out of scope and is **not**
introduced in Phase 7. If a future integration needs duplicate-safe mutations
(e.g. webhook replay), it should add request idempotency keys at the API layer
on top of the atomic database transitions described above.

## Realtime events (Phase 8)

QueueService emits best-effort realtime events after successful mutations (see
`docs/REALTIME_ARCHITECTURE.md`). Events are fire-and-forget: a realtime
transport failure never rolls back or fails the queue operation, and the
realtime layer never depends on a store (no outbox, no distributed
transaction). Sequences are assigned by the in-memory transport from a single
process-local counter, so ordering is only guaranteed within one Node process —
the same scope as the current mock repository. When Phase 12 moves state to
PostgreSQL (and if realtime moves to a production provider), the provider must
supply its own ordering and catch-up semantics; the client contract (queue
topic + after-sequence cursor) is provider-neutral.

## Rules preserved

- At most one `CALLED` or `IN_CONSULTATION` patient per queue, always.
- State transitions are driven exclusively by `QueueService` via the state
  machine; no second engine or duplicated queue logic.
- The mock repository must not pretend to solve concurrency; Phase 12 owns it.