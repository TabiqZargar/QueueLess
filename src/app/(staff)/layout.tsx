import { guardPage } from "@/lib/auth/page-guard";
import { USER_ROLES } from "@/lib/auth/roles";
import { Forbidden } from "@/components/forbidden";
import { AppHeader } from "@/components/app-header";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guard = await guardPage([USER_ROLES.STAFF], "/staff/dashboard");

  if (guard.status === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}