import { InMemoryRealtimeTransport } from "./in-memory-transport";
import {
  createQueuePublisher,
  QueueEventPublisher,
  SafeQueuePublisher,
} from "./publisher";
import type { RealtimeTransport } from "./transport";

/**
 * Application-wide realtime wiring.
 *
 * The shared transport keeps events and sequence state consistent across every
 * server request within the running process. Like MockQueueRepository, the
 * in-memory transport is the development stand-in; the realtime/database
 * contributor swaps only the transport construction here.
 *
 *   const transport = new RedisRealtimeTransport(redis);
 *
 * The safe publisher guarantees a realtime failure can never fail or roll back
 * a queue mutation. QueueService (src/lib/queue/instance.ts) receives this
 * publisher via constructor injection.
 */
export const realtimeTransport: RealtimeTransport =
  new InMemoryRealtimeTransport();

export const realtimePublisher: QueueEventPublisher = new SafeQueuePublisher(
  createQueuePublisher(realtimeTransport)
);