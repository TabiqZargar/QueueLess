import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/authorization";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { SessionNav } from "@/components/session/session-nav";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <div className="absolute top-4 right-4">
        <SessionNav />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">QueueLess</h1>
        <p className="mt-2 text-lg text-gray-600">
          Healthcare Queue Management
        </p>
        {user && (
          <p className="mt-4 text-sm text-gray-500">
            Signed in as{" "}
            <span className="font-medium text-gray-900">{user.name}</span> (
            {ROLE_LABELS[user.role]})
          </p>
        )}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/join"
            className="rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700 focus-ring"
          >
            Join Queue
          </Link>
          <Link
            href="/staff/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 focus-ring"
          >
            Staff Dashboard
          </Link>
          <Link
            href="/doctor/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 focus-ring"
          >
            Doctor Dashboard
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 focus-ring"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}