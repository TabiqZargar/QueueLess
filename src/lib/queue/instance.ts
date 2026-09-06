import { QueueService } from "./queue-service";
import { MockQueueRepository } from "./mock-repository";
import { realtimePublisher } from "@/lib/realtime/instance";
import { createNotificationHandler } from "@/lib/notifications/instance";

/**
 * Application-wide queue service instance.
 *
 * During development (Phase 3) the queue domain is backed by an in-memory
 * MockQueueRepository. A single instance is shared process-wide so that state
 * persists across server requests within the running dev/production process.
 *
 * The realtime publisher is injected here (Phase 8): QueueService emits
 * best-effort realtime events after successful mutations. The notification
 * handler (Phase 9) converts stored domain events into patient notifications
 * through the policy → service → delivery pipeline.
 *
 * When the PostgreSQL/Prisma repository is introduced by the database
 * contributor, only repository construction changes; the notification handler
 * is unaffected because it depends on QueueService's public API only.
 */
const repository = new MockQueueRepository();

let queueServiceRef: QueueService;
const notificationHandler = createNotificationHandler(() => queueServiceRef);
queueServiceRef = new QueueService(repository, realtimePublisher, notificationHandler);

export const queueService = queueServiceRef;
