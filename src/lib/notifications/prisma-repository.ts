import { db } from "../../../prisma/db";
import {
  CreateNotificationInput,
  NotificationRepository,
} from "./repository";
import { Notification } from "./types";

export class PrismaNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<Notification> {
    try {
      const notification = await db.orm.public.Notification.create({
        id: crypto.randomUUID(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        channel: input.channel,
        queueId: input.queueId ?? null,
        entryId: input.entryId ?? null,
        eventId: input.eventId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
      return this.toNotification(notification);
    } catch (error) {
      const existing = await this.findDuplicate(input);
      if (existing) {
        return existing;
      }
      throw error;
    }
  }

  async listByUser(userId: string): Promise<Notification[]> {
    const notifications = await db.orm.public.Notification
      .where({ userId })
      .orderBy((notification) => notification.createdAt.desc())
      .all();

    return notifications.map((notification) => this.toNotification(notification));
  }

  async countUnreadByUser(userId: string): Promise<number> {
    const notifications = await db.orm.public.Notification
      .where({ userId, readAt: null })
      .all();
    return notifications.length;
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification | null> {
    const notification = await db.orm.public.Notification
      .where({ id: notificationId, userId })
      .first();
    if (!notification) {
      return null;
    }

    const updated = await db.orm.public.Notification
      .where({ id: notificationId, userId })
      .update({ readAt: notification.readAt ?? new Date().toISOString() });
    return this.toNotification(updated);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const unread = await db.orm.public.Notification
      .where({ userId, readAt: null })
      .all();
    if (unread.length === 0) {
      return 0;
    }

    const readAt = new Date().toISOString();
    await db.transaction(async (tx) => {
      for (const notification of unread) {
        await tx.orm.public.Notification
          .where({ id: notification.id, userId, readAt: null })
          .update({ readAt });
      }
    });
    return unread.length;
  }

  private async findDuplicate(
    input: CreateNotificationInput
  ): Promise<Notification | null> {
    if (input.eventId !== undefined) {
      const notification = await db.orm.public.Notification.where({
        userId: input.userId,
        type: input.type,
        eventId: input.eventId,
      }).first();
      if (notification) {
        return this.toNotification(notification);
      }
    }

    if (input.dedupeKey !== undefined) {
      const notification = await db.orm.public.Notification.where({
        userId: input.userId,
        type: input.type,
        dedupeKey: input.dedupeKey,
      }).first();
      if (notification) {
        return this.toNotification(notification);
      }
    }

    return null;
  }

  private toNotification(value: any): Notification {
    return {
      id: value.id,
      userId: value.userId,
      type: value.type,
      title: value.title,
      message: value.message,
      channel: value.channel,
      queueId: value.queueId ?? undefined,
      entryId: value.entryId ?? undefined,
      eventId: value.eventId ?? undefined,
      dedupeKey: value.dedupeKey ?? undefined,
      createdAt: new Date(value.createdAt).toISOString(),
      readAt: value.readAt ? new Date(value.readAt).toISOString() : null,
    };
  }
}
