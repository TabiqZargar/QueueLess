import { QueueService } from "./queue-service";
import { MockQueueRepository } from "./mock-repository";
import { realtimePublisher } from "@/lib/realtime/instance";

/**
 * Application-wide queue service instance.
 *
 * During development (Phase 3) the queue domain is backed by an in-memory
 * MockQueueRepository. A single instance is shared process-wide so that state
 * persists across server requests within the running dev/production process.
 *
 * The realtime publisher is injected here (Phase 8): QueueService emits
 * best-effort realtime events after successful mutations. When the
 * PostgreSQL/Prisma repository is introduced by the database contributor, this
 * is the single place that changes:
 *
 *   const repository = new PrismaQueueRepository();
 *   export const queueService = new QueueService(repository, realtimePublisher);
 *
 * No UI or feature code needs to change.
 */
const repository = new MockQueueRepository();

export const queueService = new QueueService(repository, realtimePublisher);
