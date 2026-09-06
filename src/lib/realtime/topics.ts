/**
 * Topic naming for queue realtime streams. A single stream per queue keeps the
 * model simple: every subscriber for a queue sees every event for that queue
 * regardless of event type. A production provider can map `queue:<id>` onto its
 * own channel model without changing callers.
 */
export const QUEUE_TOPIC_PREFIX = "queue:";

export function queueTopic(queueId: string): string {
  return `${QUEUE_TOPIC_PREFIX}${queueId}`;
}

/**
 * Extracts the queue id from a topic, or null when the topic is not a queue
 * topic. Does not validate the queue's existence.
 */
export function parseQueueTopic(topic: string): string | null {
  if (!topic.startsWith(QUEUE_TOPIC_PREFIX)) return null;
  const queueId = topic.slice(QUEUE_TOPIC_PREFIX.length);
  return queueId.length > 0 ? queueId : null;
}

export function isQueueTopic(topic: string): boolean {
  return parseQueueTopic(topic) !== null;
}