import type {
  QueueRealtimeEvent,
  QueueRealtimeEventInput,
  QueueRealtimeEventType,
} from "./events";
import { parseQueueTopic } from "./topics";
import type { RealtimeSubscription, RealtimeTransport } from "./transport";
import { db } from "../../../prisma/db";

/**
 * Maximum number of events readEvents returns in a single call.
 *
 * Replays after a long disconnect are intentionally paged: the client advances
 * its cursor to `latestSequence` after every poll, so it reaches the live tail
 * across successive bounded reads instead of one unbounded replay.
 */
export const DEFAULT_REALTIME_READ_LIMIT = 100;

/** A stored row as surfaced by the ORM contract (see prisma/schema.d.ts). */
interface QueueRealtimeEventRow {
  id: bigint;
  queueId: string;
  eventType: QueueRealtimeEventType;
  eventId: string;
  entryId: string | null;
  occurredAt: string;
}

/**
 * Durable, database-backed realtime transport.
 *
 * Events are written to and read from the shared `queueRealtimeEvent` table in
 * PostgreSQL, so every application instance observes the same stream and a
 * process restart loses nothing. The database assigns each event a globally
 * monotonic `BIGSERIAL` id that doubles as the cursor: `readEvents(topic,
 * after)` returns the queue's events with `id > after` in ascending order.
 *
 * Unlike {@link InMemoryRealtimeTransport}, sequences come from the database,
 * not a process-local counter, so "after" cursors are valid across instances,
 * restarts, and horizontally scaled servers.
 */
export class PostgresRealtimeTransport implements RealtimeTransport {
  private readonly readLimit: number;
  private readonly listeners = new Map<string, Set<(event: QueueRealtimeEvent) => void>>();

  constructor(options: { readLimit?: number } = {}) {
    const limit = options.readLimit ?? DEFAULT_REALTIME_READ_LIMIT;
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error(`readLimit must be a positive integer, got ${limit}`);
    }
    this.readLimit = limit;
  }

  async publish(
    topic: string,
    event: QueueRealtimeEventInput
  ): Promise<QueueRealtimeEvent> {
    const queueId = queueIdOrThrow(topic);

    const row = await db.orm.public.QueueRealtimeEvent.create({
      queueId,
      eventType: event.type,
      eventId: event.id,
      entryId: event.type === "QUEUE_ENTRY_UPDATED" ? event.entryId : null,
      occurredAt: event.occurredAt,
    });

    const stamped = toQueueRealtimeEvent(row as QueueRealtimeEventRow);

    for (const listener of Array.from(this.listeners.get(topic) ?? [])) {
      try {
        listener(stamped);
      } catch {
        // A failing listener must not break publishing or other listeners.
      }
    }

    return stamped;
  }

  subscribe(
    topic: string,
    listener: (event: QueueRealtimeEvent) => void
  ): RealtimeSubscription {
    let topicListeners = this.listeners.get(topic);
    if (!topicListeners) {
      topicListeners = new Set();
      this.listeners.set(topic, topicListeners);
    }
    topicListeners.add(listener);

    return {
      unsubscribe: () => {
        this.listeners.get(topic)?.delete(listener);
      },
    };
  }

  async readEvents(
    topic: string,
    afterSequence: number
  ): Promise<QueueRealtimeEvent[]> {
    const queueId = queueIdOrThrow(topic);
    const cursor = BigInt(Math.max(0, Math.trunc(afterSequence)));

    const rows = await db.orm.public.QueueRealtimeEvent
      .where((row) => row.queueId.eq(queueId))
      .where((row) => row.id.gt(cursor))
      .orderBy((row) => row.id.asc())
      .limit(this.readLimit)
      .all();

    return rows.map((row) => toQueueRealtimeEvent(row as QueueRealtimeEventRow));
  }
}

/**
 * Maps a stored row back into the realtime event shape.
 *
 * The transport never exposes the raw Prisma model: only the queue id, the
 * coarse event vocabulary, the transport sequence, and the input's own id /
 * timestamp / entry reference cross the contract boundary.
 */
function toQueueRealtimeEvent(row: QueueRealtimeEventRow): QueueRealtimeEvent {
  const base = {
    id: row.eventId,
    queueId: row.queueId,
    occurredAt: row.occurredAt,
    sequence: Number(row.id),
  };

  if (row.eventType === "QUEUE_ENTRY_UPDATED") {
    return { ...base, type: "QUEUE_ENTRY_UPDATED", entryId: row.entryId! };
  }
  return { ...base, type: row.eventType };
}

/**
 * Only queue topics are supported: `queueId` is the authoritative domain key
 * and topics are derived from it, so arbitrary topic strings are never stored.
 */
function queueIdOrThrow(topic: string): string {
  const queueId = parseQueueTopic(topic);
  if (queueId === null) {
    throw new Error(
      `PostgresRealtimeTransport only supports queue topics (got "${topic}")`
    );
  }
  return queueId;
}