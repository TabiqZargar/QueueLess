import type {
  QueueRealtimeEvent,
  QueueRealtimeEventInput,
} from "./events";

export interface RealtimeSubscription {
  unsubscribe(): void;
}

/**
 * Provider-neutral realtime transport.
 *
 * A production provider (e.g. Supabase Realtime, Redis pub/sub, a message
 * broker) implements the same three operations: publish events, deliver events
 * to subscribed listeners, and replay stored events after a sequence cursor for
 * late/refreshed subscribers. Callers never depend on a concrete transport.
 */
export interface RealtimeTransport {
  publish(
    topic: string,
    event: QueueRealtimeEventInput
  ): Promise<QueueRealtimeEvent>;

  subscribe(
    topic: string,
    listener: (event: QueueRealtimeEvent) => void
  ): RealtimeSubscription;

  readEvents(
    topic: string,
    afterSequence: number
  ): Promise<QueueRealtimeEvent[]>;
}