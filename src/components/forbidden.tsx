import Link from "next/link";

export function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-4">
      <div className="max-w-md text-center">
        <p className="text-label-md font-medium text-danger-600">
          Access denied
        </p>
        <h1 className="mt-2 text-headline-lg text-on-surface">
          You don&apos;t have permission to view this page
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Your current role cannot access this area. Sign in with a different
          role if you have access.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus-ring"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-outline bg-white px-5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container focus-ring"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}