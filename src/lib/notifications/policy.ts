import { QueueEntry, QueueEvent, QueueEventType } from "@/types";
import { QueueService } from "@/lib/queue/queue-service";
import {
  formatConsultationStartedMessage,
  formatPatientCalledMessage,
  formatQueueJoinedMessage,
  formatTurnApproachingMessage,
  NO_SHOW_MESSAGE,
  QUEUE_PAUSED_MESSAGE,
  QUEUE_RESUMED_MESSAGE,
  notificationTitle,
} from "./formatting";
import { NotificationIntent, NotificationType } from "./types";

const ACTIVE_ENTRY_STATUSES: readonly QueueEntry["status"][] = [
  "WAITING",
  "CALLED",
  "IN_CONSULTATION",
];

/**
 * The authoritative reads the policy needs from the queue domain. Injected so
 * the policy stays pure and independently testable, and so it never reaches
 * into a repository directly.
 */
export interface NotificationPolicyDeps {
  getQueueService: () => QueueService;
}

export interface NotificationPolicyOptions {
  /**
   * How many patients may remain ahead before a TURN_APPROACHING notification
   * is generated for a waiting entry. Defaults to 2.
   */
  turnApproachingThreshold?: number;

  /**
   * Queue event types after which the position of WAITING entries may have
   * shifted, i.e. the only times TURN_APPROACHING is (re)considered.
   */
  bubbleEvents?: readonly QueueEventType[];
}

const DEFAULT_BUBBLE_EVENTS: readonly QueueEventType[] = [
  "QUEUE_JOINED",
  "PATIENT_CALLED",
  "CONSULTATION_STARTED",
  "CONSULTATION_COMPLETED",
  "PATIENT_NO_SHOW",
  "PATIENT_CANCELLED",
];

/**
 * Maps a queue domain event to the notification kind patients receive for it.
 * QUEUE_JOINED stays QUEUE_JOINED; PATIENT_NO_SHOW surfaces as the stable
 * NO_SHOW notification type. Events that have no direct notification return
 * null (they may still bubble positions for TURN_APPROACHING).
 */
function mapEventToNotificationType(
  eventType: QueueEventType
): NotificationType | null {
  switch (eventType) {
    case "QUEUE_JOINED":
      return "QUEUE_JOINED";
    case "PATIENT_CALLED":
      return "PATIENT_CALLED";
    case "CONSULTATION_STARTED":
      return "CONSULTATION_STARTED";
    case "PATIENT_NO_SHOW":
      return "NO_SHOW";
    default:
      return null;
  }
}

/**
 * Translates a queue domain event into the notifications patients should
 * receive. This is the single place that decides WHAT is notified; delivery
 * and formatting live elsewhere.
 *
 * Notifications are keyed off the domain event (which is only recorded after a
 * successful mutation), so a failed mutation never produces a notification.
 */
export class NotificationPolicy {
  private readonly threshold: number;
  private readonly bubbleEvents: readonly QueueEventType[];

  constructor(
    private deps: NotificationPolicyDeps,
    options: NotificationPolicyOptions = {}
  ) {
    this.threshold = options.turnApproachingThreshold ?? 2;
    this.bubbleEvents = options.bubbleEvents ?? DEFAULT_BUBBLE_EVENTS;
  }

  async evaluate(event: QueueEvent): Promise<NotificationIntent[]> {
    switch (event.eventType) {
      case "QUEUE_JOINED":
      case "PATIENT_CALLED":
      case "CONSULTATION_STARTED":
      case "PATIENT_NO_SHOW":
      case "CONSULTATION_COMPLETED":
      case "PATIENT_CANCELLED":
        return this.evaluateEntryEvent(event);
      case "QUEUE_PAUSED":
      case "QUEUE_RESUMED":
        return this.queueStatusIntents(event);
      default:
        // QUEUE_CREATED, WALK_IN_ADDED (no individual recipient), DOCTOR_DELAYED,
        // and the enum-only QUEUE_COMPLETED / QUEUE_CANCELLED produce nothing.
        return [];
    }
  }

  private async evaluateEntryEvent(
    event: QueueEvent
  ): Promise<NotificationIntent[]> {
    const service = this.deps.getQueueService();
    const intents: NotificationIntent[] = [];

    // 1:1 event → patient notification, when the event has a recipient.
    const primary = await this.primaryIntent(event, service);
    if (primary) {
      intents.push(primary);
    }

    // Position-sensitive: after any bubble event, re-evaluate each WAITING
    // patient so TURN_APPROACHING stays within the configurable window.
    if (this.bubbleEvents.includes(event.eventType)) {
      const approaching = await this.maybeTurnApproaching(event, service);
      intents.push(...approaching);
    }

    return intents;
  }

  private async primaryIntent(
    event: QueueEvent,
    service: QueueService
  ): Promise<NotificationIntent | null> {
    const type = mapEventToNotificationType(event.eventType);
    if (!type || !event.queueEntryId) {
      return null;
    }

    const entry = await service.getQueueEntry(event.queueEntryId);
    if (!entry) {
      return null;
    }

    const base = {
      userId: entry.patientId,
      type,
      title: notificationTitle(type),
      queueId: event.queueId,
      entryId: entry.id,
      eventId: event.id,
    };

    switch (type) {
      case "QUEUE_JOINED": {
        const queue = await service.getQueue(event.queueId);
        return {
          ...base,
          message: formatQueueJoinedMessage(
            entry.tokenNumber,
            queue?.doctor?.displayName
          ),
        };
      }
      case "PATIENT_CALLED":
        return {
          ...base,
          message: formatPatientCalledMessage(entry.tokenNumber),
        };
      case "CONSULTATION_STARTED":
        return {
          ...base,
          message: formatConsultationStartedMessage(entry.tokenNumber),
        };
      case "NO_SHOW":
        return { ...base, message: NO_SHOW_MESSAGE };
      default:
        return null;
    }
  }

  private async maybeTurnApproaching(
    event: QueueEvent,
    service: QueueService
  ): Promise<NotificationIntent[]> {
    if (!event.queueId) {
      return [];
    }
    const entries = await service.getQueueEntries(event.queueId);

    const intents: NotificationIntent[] = [];
    for (const entry of entries) {
      if (entry.status !== "WAITING") continue;
      const patientsAhead = await this.safePatientsAhead(entry.id, service);
      // Only notify when ahead count is inside the window (1..threshold);
      // a patient with nobody ahead is not "approaching".
      if (patientsAhead !== null && patientsAhead >= 1 && patientsAhead <= this.threshold) {
        intents.push({
          userId: entry.patientId,
          type: "TURN_APPROACHING",
          title: notificationTitle("TURN_APPROACHING"),
          message: formatTurnApproachingMessage(patientsAhead),
          queueId: event.queueId,
          entryId: entry.id,
          dedupeKey: `turn-approaching:${event.queueId}:${entry.id}`,
        });
      }
    }
    return intents;
  }

  /**
   * patientsAhead always comes from the authoritative QueueService position
   * (never re-derived from a filtered entry list within notification code).
   * A missing entry is guarded and skipped rather than throwing.
   */
  private async safePatientsAhead(
    entryId: string,
    service: QueueService
  ): Promise<number | null> {
    try {
      const position = await service.getQueuePosition(entryId);
      return position.patientsAhead;
    } catch {
      return null;
    }
  }

  private async queueStatusIntents(
    event: QueueEvent
  ): Promise<NotificationIntent[]> {
    const service = this.deps.getQueueService();
    const entries = await service.getQueueEntries(event.queueId);
    const affected = entries.filter((e) =>
      ACTIVE_ENTRY_STATUSES.includes(e.status)
    );

    const isPaused = event.eventType === "QUEUE_PAUSED";
    const type: NotificationType = isPaused ? "QUEUE_PAUSED" : "QUEUE_RESUMED";
    return affected.map((entry) => ({
      userId: entry.patientId,
      type,
      title: notificationTitle(type),
      message: isPaused ? QUEUE_PAUSED_MESSAGE : QUEUE_RESUMED_MESSAGE,
      queueId: event.queueId,
      entryId: entry.id,
      eventId: event.id,
    }));
  }
}