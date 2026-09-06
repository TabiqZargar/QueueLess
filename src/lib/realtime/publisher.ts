import type { QueueRealtimeEventInput } from "./events";
import { queueTopic } from "./topics";
import type { RealtimeTransport } from "./transport";

/**
 * Contract between the queue domain and the realtime layer.
 *
 * The queue domain never sees topics or transports: it declares a queue id and
 * a realtime event, and the publisher routes it to the queue's stream. This
 * keeps QueueService framework-independent and makes the realtime layer a
 * drop-in concern.
 */
export interface QueueEventPublisher {
  publish(queueId: string, event: QueueRealtimeEventInput): Promise<void>;
}

/**
 * Builds a publisher over any transport. Queues are mapped to the
 * `queue:<id>` topic, so all queue events share one stream.
 */
export function createQueuePublisher(
  transport: RealtimeTransport
): QueueEventPublisher {
  return {
    async publish(queueId, event) {
      await transport.publish(queueTopic(queueId), event);
    },
  };
}

/**
 * Guards queue mutations from realtime failures.
 *
 * Realtime delivery is best-effort: an event publish must never roll back or
 * fail the underlying queue operation, and the realtime layer must never
 * depend on a store (no outbox, no distributed transaction). This wrapper
 * swallows publish errors and, once delivery has failed, stops attempting so a
 * permanently broken transport cannot add latency to every mutation.
 */
export class SafeQueuePublisher implements QueueEventPublisher {
  private failed = false;

  constructor(private inner: QueueEventPublisher) {}

  isHealthy(): boolean {
    return !this.failed;
  }

  async publish(queueId: string, event: QueueRealtimeEventInput): Promise<void> {
    if (this.failed) return;
    try {
      await this.inner.publish(queueId, event);
    } catch {
      this.failed = true;
    }
  }
}