import type {
  QueueRealtimeEvent,
  QueueRealtimeEventInput,
} from "./events";
import type { RealtimeSubscription, RealtimeTransport } from "./transport";

interface TopicState {
  events: QueueRealtimeEvent[];
  listeners: Set<(event: QueueRealtimeEvent) => void>;
}

/**
 * Development-only in-memory realtime transport.
 *
 * Events are stored per topic in memory and listeners receive events published
 * to the same topic. Sequences are assigned from a single global counter, so
 * they are only meaningful within this process - a documented limitation that
 * a production provider resolves with its own ordering guarantees.
 *
 * Listener errors are swallowed so a bad subscriber can never break publishing
 * to other subscribers or abort the originating queue mutation.
 */
export class InMemoryRealtimeTransport implements RealtimeTransport {
  private topics = new Map<string, TopicState>();
  private sequence = 0;

  async publish(
    topic: string,
    event: QueueRealtimeEventInput
  ): Promise<QueueRealtimeEvent> {
    // The caller supplies a valid discriminated event; spreading it and adding
    // the transport-owned sequence preserves the variant's key set.
    const stamped = {
      ...event,
      sequence: ++this.sequence,
    } as QueueRealtimeEvent;

    const state = this.topicState(topic);
    state.events.push(stamped);

    for (const listener of Array.from(state.listeners)) {
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
    const state = this.topicState(topic);
    state.listeners.add(listener);

    return {
      unsubscribe: () => {
        const current = this.topics.get(topic);
        current?.listeners.delete(listener);
      },
    };
  }

  async readEvents(
    topic: string,
    afterSequence: number
  ): Promise<QueueRealtimeEvent[]> {
    const state = this.topics.get(topic);
    if (!state) return [];
    return state.events.filter((e) => e.sequence > afterSequence);
  }

  /** Number of events retained for a topic (available for tests/inspection). */
  eventCount(topic: string): number {
    return this.topics.get(topic)?.events.length ?? 0;
  }

  private topicState(topic: string): TopicState {
    let state = this.topics.get(topic);
    if (!state) {
      state = { events: [], listeners: new Set() };
      this.topics.set(topic, state);
    }
    return state;
  }
}