import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const rawNext = searchParams.next;
  const next =
    typeof rawNext === "string" && rawNext.startsWith("/") ? rawNext : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign in to QueueLess</h1>
          <p className="mt-2 text-gray-600">
            Choose a development role to continue. This is a mock sign-in for
            development only.
          </p>
        </div>

        <LoginForm next={next} />
      </div>
      <p className="mt-8 text-xs text-gray-400">
        Development build - no real user accounts are created.
      </p>
    </div>
  );
}