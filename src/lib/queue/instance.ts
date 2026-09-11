import { QueueService } from "./queue-service";
import { PrismaQueueRepository } from "./prisma-repository";
import { MockQueueRepository } from "./mock-repository";
import { realtimePublisher } from "@/lib/realtime/instance";
import { createNotificationHandler } from "@/lib/notifications/instance";

/**
 * Application-wide queue service instance.
 *
 * The queue domain is backed by PostgreSQL through Prisma. A single service
 * instance is shared process-wide while the database provides durability and
 * cross-process concurrency control.
 *
 * The realtime publisher is injected here (Phase 8): QueueService emits
 * best-effort realtime events after successful mutations. The notification
 * handler (Phase 9) converts stored domain events into patient notifications
 * through the policy → service → delivery pipeline.
 *
 */
const repository = process.env.NODE_ENV !== "test" && process.env.DATABASE_URL
	? new PrismaQueueRepository()
	: new MockQueueRepository();

let queueServiceRef: QueueService;
const notificationHandler = createNotificationHandler(() => queueServiceRef);
queueServiceRef = new QueueService(repository, realtimePublisher, notificationHandler);

export const queueService = queueServiceRef;
