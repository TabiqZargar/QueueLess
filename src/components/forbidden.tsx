import Link from "next/link";

export function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-danger-600">Access denied</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          You don&apos;t have permission to view this page
        </h1>
        <p className="mt-2 text-gray-600">
          Your current role cannot access this area. Sign in with a different
          role if you have access.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus-ring"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-ring"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}