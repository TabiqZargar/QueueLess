import type { QueueService } from "@/lib/queue/queue-service";
import { PrismaNotificationRepository } from "./prisma-repository";
import { MockNotificationRepository } from "./mock-repository";
import { NotificationService } from "./service";
import { NotificationPolicy } from "./policy";
import {
  QueueEventNotificationHandler,
  SafeNotificationHandler,
} from "./event-handler";
import { InAppNotificationDelivery } from "./delivery";
import type { NotificationEventHandler } from "./event-handler";

/**
 * Application-wide notification singletons.
 *
 * The handler is NOT wired here to avoid a circular import with the queue
 * instance. `createNotificationHandler` is called once by `src/lib/queue/instance.ts`
 * after the queue service is constructed, and the result is injected as the
 * third constructor argument.
 *
 *   export const notificationRepository = new PrismaNotificationRepository();
 *   export const notificationService = new NotificationService(notificationRepository);
 */

export const notificationRepository =
  process.env.NODE_ENV !== "test" && process.env.DATABASE_URL
  ? new PrismaNotificationRepository()
  : new MockNotificationRepository();

export const notificationService = new NotificationService(
  notificationRepository
);

/**
 * Builds the notification pipeline over an already-constructed QueueService.
 * Closures defer the getter read until the first actual notification, which
 * happens long after both instances are initialized — so circular references
 * between the two singleton files are avoided without module-level hacks.
 */
export function createNotificationHandler(
  serviceGetter: () => QueueService
): NotificationEventHandler {
  const policy = new NotificationPolicy({
    getQueueService: serviceGetter,
  });
  const handler = new QueueEventNotificationHandler(
    policy,
    notificationService,
    new InAppNotificationDelivery()
  );
  return new SafeNotificationHandler(handler);
}