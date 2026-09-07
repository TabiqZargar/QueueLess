import Link from "next/link";
import { SessionNav } from "@/components/session/session-nav";
import { getCurrentUser } from "@/lib/auth/authorization";
import { USER_ROLES } from "@/lib/auth/roles";
import { getPatientNotifications } from "@/features/notifications/get-notifications";
import { NotificationBell } from "@/features/notifications/notification-bell";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const notifications =
    user && user.role === USER_ROLES.PATIENT
      ? await getPatientNotifications(user)
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
            QueueLess
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/join"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-ring"
            >
              Join a queue
            </Link>
            {notifications && (
              <NotificationBell
                initialNotifications={notifications.notifications}
                initialUnreadCount={notifications.unreadCount}
              />
            )}
            <SessionNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
