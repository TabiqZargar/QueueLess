import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/authorization";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { BrandLogo } from "@/components/brand-logo";
import { UserMenu } from "@/components/session/user-menu";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { getPatientNotifications } from "@/features/notifications/get-notifications";
import type { UserRole } from "@/types";
import type { AuthUser } from "@/lib/auth/types";

const NAV_ITEMS: Record<UserRole, { href: string; label: string }[]> = {
  PATIENT: [
    { href: "/join", label: "Join Queue" },
    { href: "/queue/queue-1/status", label: "My Status" },
  ],
  STAFF: [
    { href: "/staff/dashboard", label: "Dashboard" },
  ],
  DOCTOR: [
    { href: "/doctor/dashboard", label: "Dashboard" },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard" },
  ],
};

export async function AppHeader() {
  const user = await getCurrentUser();
  const role = user?.role ?? "PATIENT";
  const navItems = NAV_ITEMS[role];
  const notifications =
    user && role === "PATIENT"
      ? await getPatientNotifications(user)
      : null;

  return (
    <header className="border-b border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <BrandLogo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {notifications && (
            <NotificationBell
              initialNotifications={notifications.notifications}
              initialUnreadCount={notifications.unreadCount}
            />
          )}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}