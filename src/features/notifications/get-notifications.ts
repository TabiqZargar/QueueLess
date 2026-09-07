import { requireRole } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import { notificationService } from "@/lib/notifications/instance";
import { NotificationSummary } from "@/lib/notifications/types";
import { AuthUser } from "@/lib/auth/types";

export interface PatientNotificationsData {
  notifications: NotificationSummary[];
  unreadCount: number;
}

/**
 * Server read that assembles the patient's notification list DTO. Ownership is
 * enforced by scoping reads to the authenticated session user — the client
 * never supplies a user id.
 */
export async function getPatientNotifications(
  user: AuthUser
): Promise<PatientNotificationsData> {
  await requireRole(USER_ROLES.PATIENT);
  const [notifications, unreadCount] = await Promise.all([
    notificationService.getNotifications(user.id),
    notificationService.getUnreadCount(user.id),
  ]);
  return { notifications, unreadCount };
}