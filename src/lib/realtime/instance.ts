import { InMemoryRealtimeTransport } from "./in-memory-transport";
import { PostgresRealtimeTransport } from "./postgres-transport";
import {
  createQueuePublisher,
  QueueEventPublisher,
  SafeQueuePublisher,
} from "./publisher";
import type { RealtimeTransport } from "./transport";

/**
 * Application-wide realtime wiring.
 *
 * Two transports exist behind the same provider-neutral contract:
 *
 * - `PostgresRealtimeTransport` (production) persists events in the shared
 *   `queueRealtimeEvent` table, so sequences and replay are consistent across
 *   application instances and survive process restarts.
 * - `InMemoryRealtimeTransport` (development, tests) is the process-local
 *   stand-in used when no database is configured.
 *
 * Selection mirrors `src/lib/queue/instance.ts`: PostgreSQL is used when a
 * `DATABASE_URL` is available outside the test runtime; otherwise realtime
 * falls back to memory. Because it is the same database, no separate broker,
 * Redis, or WebSocket infrastructure is involved.
 *
 * The safe publisher guarantees a realtime failure can never fail or roll back
 * a queue mutation. QueueService (src/lib/queue/instance.ts) receives this
 * publisher via constructor injection.
 */
const realtimeTransport: RealtimeTransport =
  process.env.NODE_ENV !== "test" && process.env.DATABASE_URL
    ? new PostgresRealtimeTransport()
    : new InMemoryRealtimeTransport();

export { realtimeTransport };

export const realtimePublisher: QueueEventPublisher = new SafeQueuePublisher(
  createQueuePublisher(realtimeTransport)
);