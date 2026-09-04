import { QueueService } from "./queue-service";
import { MockQueueRepository } from "./mock-repository";

/**
 * Application-wide queue service instance.
 *
 * During development (Phase 3) the queue domain is backed by an in-memory
 * MockQueueRepository. A single instance is shared process-wide so that state
 * persists across server requests within the running dev/production process.
 *
 * When the PostgreSQL/Prisma repository is introduced by the database
 * contributor, this is the single place that changes:
 *
 *   const repository = new PrismaQueueRepository();
 *   export const queueService = new QueueService(repository);
 *
 * No UI or feature code needs to change.
 */
const repository = new MockQueueRepository();

export const queueService = new QueueService(repository);
