import {
  Notification,
  NotificationSummary,
} from "./types";
import { NotificationRepository } from "./repository";

/**
 * Application service for the notification domain.
 *
 * Provider-independent: it knows nothing about Next.js, React, the browser or
 * any persistence vendor. It composes the repository the same way QueueService
 * composes QueueRepository, so a database-backed repository can replace the
 * mock without touching actions or UI.
 */
export class NotificationService {
  constructor(private repository: NotificationRepository) {}

  async createNotification(input: {
    userId: string;
    type: Notification["type"];
    title: string;
    message: string;
    channel: Notification["channel"];
    queueId?: string;
    entryId?: string;
    eventId?: string;
    dedupeKey?: string;
  }): Promise<Notification> {
    return this.repository.create(input);
  }

  async getNotifications(userId: string): Promise<NotificationSummary[]> {
    const list = await this.repository.listByUser(userId);
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      readAt: n.readAt,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countUnreadByUser(userId);
  }

  /**
   * Marks a single notification read. Scoped by userId so a caller can only
   * ever mark their own notification. Missing or not-owned ids resolve to a
   * no-op (returns false), never an error.
   */
  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    const updated = await this.repository.markAsRead(notificationId, userId);
    return updated !== null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.repository.markAllAsRead(userId);
  }
}