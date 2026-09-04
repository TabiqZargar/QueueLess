import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">QueueLess</h1>
        <p className="mt-2 text-lg text-gray-600">
          Healthcare Queue Management
        </p>
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
        </div>
      </div>
    </div>
  );
}
