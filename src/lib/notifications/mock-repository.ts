import {
  Notification,
  NotificationChannel,
  NotificationType,
} from "./types";
import {
  CreateNotificationInput,
  NotificationRepository,
} from "./repository";

/**
 * In-memory notification store (development stand-in).
 *
 * Determinstic deduplication: `create` returns the existing notification when
 * a user already has one of the same type produced by the same event (via
 * `eventId`, for real queue events) or the same `dedupeKey` (for generated
 * notifications such as TURN_APPROACHING). This keeps a single mutation from
 * generating duplicate entries in-process. A real database repository would
 * enforce the same guarantee with a unique constraint; see
 * docs/NOTIFICATIONS_ARCHITECTURE.md for the handoff.
 */
export class MockNotificationRepository implements NotificationRepository {
  private notifications: Notification[];
  private nextId = 1000;

  constructor(seed: Notification[] = []) {
    this.notifications = clone(seed);
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    const existing = this.findDuplicate(input);
    if (existing) {
      return existing;
    }

    const notification: Notification = {
      ...input,
      id: `notification-${this.nextId++}`,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    this.notifications.push(notification);
    return notification;
  }

  async listByUser(userId: string): Promise<Notification[]> {
    return this.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => {
        const byTime = b.createdAt.localeCompare(a.createdAt);
        if (byTime !== 0) return byTime;
        return b.id.localeCompare(a.id);
      });
  }

  async countUnreadByUser(userId: string): Promise<number> {
    return this.notifications.filter(
      (n) => n.userId === userId && n.readAt === null
    ).length;
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification | null> {
    const index = this.notifications.findIndex(
      (n) => n.id === notificationId && n.userId === userId
    );
    if (index === -1) {
      return null;
    }
    this.notifications[index] = {
      ...this.notifications[index],
      readAt: new Date().toISOString(),
    };
    return this.notifications[index];
  }

  async markAllAsRead(userId: string): Promise<number> {
    let marked = 0;
    this.notifications = this.notifications.map((n) => {
      if (n.userId === userId && n.readAt === null) {
        marked += 1;
        return { ...n, readAt: new Date().toISOString() };
      }
      return n;
    });
    return marked;
  }

  /**
   * Two notifications are considered the same when the user, type and either
   * the originating event id or the generated dedupe key all match.
   */
  private findDuplicate(
    input: CreateNotificationInput
  ): Notification | null {
    return (
      this.notifications.find(
        (n) =>
          n.userId === input.userId &&
          n.type === input.type &&
          ((input.eventId !== undefined && n.eventId === input.eventId) ||
            (input.dedupeKey !== undefined &&
              n.dedupeKey === input.dedupeKey))
      ) ?? null
    );
  }
}

function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(clone) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = clone((value as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return value;
}