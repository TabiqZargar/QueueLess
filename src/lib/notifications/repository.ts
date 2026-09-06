import { Notification, NotificationChannel, NotificationType } from "./types";

/**
 * Minimal notification persistence contract.
 *
 * The repository is deliberately tiny and provider-agnostic (mirroring
 * QueueRepository). `create` is the single write path; reads are scoped by
 * userId so ownership is enforced at the persistence layer, not in the UI.
 */
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  queueId?: string;
  entryId?: string;
  eventId?: string;
  dedupeKey?: string;
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;

  listByUser(userId: string): Promise<Notification[]>;

  countUnreadByUser(userId: string): Promise<number>;

  markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification | null>;

  markAllAsRead(userId: string): Promise<number>;
}