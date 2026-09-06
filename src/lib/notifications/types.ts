/**
 * Notification vocabulary (Phase 9).
 *
 * A notification is a message the system stores and shows to a user inside the
 * app. The type is the stable machine-readable kind. QUEUE_COMPLETED and
 * QUEUE_CANCELLED are declared for forward compatibility: no queue flow
 * currently produces them, so they must not be emitted yet (see the policy in
 * src/lib/notifications/policy.ts).
 */
export const NOTIFICATION_TYPES = {
  QUEUE_JOINED: "QUEUE_JOINED",
  TURN_APPROACHING: "TURN_APPROACHING",
  PATIENT_CALLED: "PATIENT_CALLED",
  CONSULTATION_STARTED: "CONSULTATION_STARTED",
  QUEUE_COMPLETED: "QUEUE_COMPLETED",
  QUEUE_CANCELLED: "QUEUE_CANCELLED",
  QUEUE_PAUSED: "QUEUE_PAUSED",
  QUEUE_RESUMED: "QUEUE_RESUMED",
  NO_SHOW: "NO_SHOW",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Delivery channels on which a notification can be shown. Only IN_APP is
 * implemented in Phase 9; the others are reserved for future providers.
 */
export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

/**
 * Stored notification model. Never carries phones, medical data, tokens or
 * other sensitive fields. `readAt` encodes the UNREAD (null) / READ (ISO)
 * state; `createdAt` is an ISO string so the model is JSON-safe and
 * framework-free.
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  queueId?: string;
  entryId?: string;
  eventId?: string;
  dedupeKey?: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * What the policy decides should become a notification. The handler is
 * responsible for attaching the originating queue event id (for event dedup)
 * and forwarding to the repository. A `dedupeKey` is set only for generated
 * notifications that have no one-to-one originating event.
 */
export interface NotificationIntent {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  queueId?: string;
  entryId?: string;
  dedupeKey?: string;
}

/**
 * The DTO exposed to the UI: operational fields only. The user id and
 * repository internals never leave the server.
 */
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}