import type { QueueEvent } from "@/types";
import { NotificationPolicy } from "./policy";
import { NotificationService } from "./service";
import type { NotificationDelivery } from "./delivery";

/**
 * Consumes domain queue events and drives the notification pipeline:
 * event → policy → create notification → deliver.
 *
 * One queued mutation may produce multiple intents (e.g. QUEUE_PAUSED notifies
 * every active patient in the queue). Each intent is isolated: a failing
 * delivery does not prevent subsequent intents from being created.
 */
export interface NotificationEventHandler {
  handle(event: QueueEvent): Promise<void>;
}

export class QueueEventNotificationHandler implements NotificationEventHandler {
  constructor(
    private policy: NotificationPolicy,
    private service: NotificationService,
    private delivery: NotificationDelivery
  ) {}

  async handle(event: QueueEvent): Promise<void> {
    const intents = await this.policy.evaluate(event);
    for (const intent of intents) {
      try {
        const notification = await this.service.createNotification({
          userId: intent.userId,
          type: intent.type,
          title: intent.title,
          message: intent.message,
          channel: "IN_APP",
          queueId: intent.queueId,
          entryId: intent.entryId,
          eventId: event.id,
          dedupeKey: intent.dedupeKey,
        });
        await this.delivery.deliver(notification);
      } catch {
        // Isolation: a failed intent never prevents subsequent intents and
        // never fails the queue mutation that produced the originating event.
      }
    }
  }
}

/**
 * Same resilience contract as SafeQueuePublisher: a failing downstream never
 * rolls back the mutation, and a permanently broken pipeline stops being called
 * so every subsequent mutation avoids unnecessary latency.
 */
export class SafeNotificationHandler implements NotificationEventHandler {
  private failed = false;

  constructor(private inner: NotificationEventHandler) {}

  isHealthy(): boolean {
    return !this.failed;
  }

  async handle(event: QueueEvent): Promise<void> {
    if (this.failed) return;
    try {
      await this.inner.handle(event);
    } catch {
      this.failed = true;
    }
  }
}