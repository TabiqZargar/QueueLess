"use server";

import { requireRole } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import { notificationIdSchema } from "@/lib/validation/identifiers";
import { notificationService } from "@/lib/notifications/instance";
import {
  ActionResult,
  toActionResultError,
} from "@/lib/queue/action-error";

/**
 * Patient notification mutations. All follow the Phase 7 pipeline:
 * authenticate → authorize (PATIENT only) → validate → service → ActionResult.
 *
 * The user id always comes from the session (requireRole); the client can
 * never target another user's notifications. Mark-as-read is intentionally
 * idempotent for missing or not-owned notification ids (no NOTIFICATION_NOT_FOUND
 * code): a stale id resolves to a harmless success.
 */

export async function markNotificationAsReadAction(
  notificationId: string
): Promise<ActionResult> {
  try {
    const user = await requireRole(USER_ROLES.PATIENT);

    const parsed = notificationIdSchema.safeParse(notificationId);
    if (!parsed.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid notification identifier.",
      };
    }

    await notificationService.markAsRead(parsed.data, user.id);
    return { success: true };
  } catch (err) {
    return toActionResultError(err);
  }
}

export async function markAllNotificationsAsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireRole(USER_ROLES.PATIENT);
    await notificationService.markAllAsRead(user.id);
    return { success: true };
  } catch (err) {
    return toActionResultError(err);
  }
}