import Link from "next/link";
import { guardPage } from "@/lib/auth/page-guard";
import { USER_ROLES } from "@/lib/auth/roles";
import { Forbidden } from "@/components/forbidden";
import { SessionNav } from "@/components/session/session-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guard = await guardPage([USER_ROLES.ADMIN], "/admin");

  if (guard.status === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            QueueLess
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Admin Dashboard</span>
            <SessionNav />
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
