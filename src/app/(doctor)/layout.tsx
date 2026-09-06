import Link from "next/link";
import { guardPage } from "@/lib/auth/page-guard";
import { USER_ROLES } from "@/lib/auth/roles";
import { Forbidden } from "@/components/forbidden";
import { SessionNav } from "@/components/session/session-nav";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guard = await guardPage([USER_ROLES.DOCTOR], "/doctor/dashboard");

  if (guard.status === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
            QueueLess
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">
              Doctor Dashboard
            </span>
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