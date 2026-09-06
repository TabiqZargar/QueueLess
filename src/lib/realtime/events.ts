import { randomUUID } from "node:crypto";

/**
 * Realtime notification vocabulary.
 *
 * These events are intentionally coarse: they never carry computed state
 * (positions, wait times, tokens). QueueService remains the single business
 * authority; a realtime event only tells subscribers "something changed" so
 * they re-fetch authoritative data. This keeps the realtime layer free of
 * domain logic and safe to swap for a production provider.
 */
export const REALTIME_EVENT_TYPES = {
  QUEUE_UPDATED: "QUEUE_UPDATED",
  QUEUE_ENTRY_UPDATED: "QUEUE_ENTRY_UPDATED",
  QUEUE_STATUS_CHANGED: "QUEUE_STATUS_CHANGED",
} as const;

export type QueueRealtimeEventType =
  (typeof REALTIME_EVENT_TYPES)[keyof typeof REALTIME_EVENT_TYPES];

export interface QueueRealtimeEventBase {
  id: string;
  type: QueueRealtimeEventType;
  occurredAt: string;
  queueId: string;
  sequence: number;
}

/**
 * Discriminated union of realtime events. `QUEUE_ENTRY_UPDATED` always names
 * the affected entry; the other two never do.
 */
export type QueueRealtimeEvent =
  | (QueueRealtimeEventBase & { type: "QUEUE_UPDATED" })
  | (QueueRealtimeEventBase & { type: "QUEUE_ENTRY_UPDATED"; entryId: string })
  | (QueueRealtimeEventBase & { type: "QUEUE_STATUS_CHANGED" });

/**
 * An event before the transport assigns its monotonic sequence. Publishers
 * hand these to the transport, which stamps and stores the final event.
 *
 * A distributive omit is required so the union keeps per-variant keys (e.g.
 * `entryId` on QUEUE_ENTRY_UPDATED) instead of collapsing to the shared keys.
 * Distribution only happens over a naked type parameter, hence the helper.
 */
type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export type QueueRealtimeEventInput = DistributiveOmit<
  QueueRealtimeEvent,
  "sequence"
>;

export interface CreateRealtimeEventInput {
  type: QueueRealtimeEventType;
  queueId: string;
  entryId?: string;
}

/**
 * Builds a realtime event. `id` and `occurredAt` default to fresh values so
 * callers stay terse; tests can pin both via `options` for deterministic
 * assertions.
 */
export function createRealtimeEvent(
  input: CreateRealtimeEventInput,
  options?: { id?: string; occurredAt?: string }
): QueueRealtimeEventInput {
  const id = options?.id ?? randomUUID();
  const occurredAt = options?.occurredAt ?? new Date().toISOString();

  if (input.type === "QUEUE_ENTRY_UPDATED") {
    if (!input.entryId) {
      throw new Error("QUEUE_ENTRY_UPDATED requires an entryId");
    }
    return {
      id,
      type: input.type,
      occurredAt,
      queueId: input.queueId,
      entryId: input.entryId,
    };
  }

  return {
    id,
    type: input.type,
    occurredAt,
    queueId: input.queueId,
  };
}