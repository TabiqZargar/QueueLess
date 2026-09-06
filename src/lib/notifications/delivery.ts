import type { Notification } from "./types";

export interface NotificationDelivery {
  deliver(notification: Notification): Promise<void>;
}

/**
 * In-app delivery is intentionally a no-op in the mock world: the notification
 * is already stored in the repository and read back by the patient UI via a
 * standard server action. This interface exists so production channels (SMS,
 * email, push, outbox) can be added without touching the handler or repository.
 */
export class InAppNotificationDelivery implements NotificationDelivery {
  async deliver(_notification: Notification): Promise<void> {}
}