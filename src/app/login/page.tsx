import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand-logo";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-container-low px-4">
      <div className="flex flex-col items-center">
        <BrandLogo />
      </div>
      <div className="mt-8 w-full max-w-md">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-headline-lg text-on-surface">
              Sign in to QueueLess
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Choose a development role to continue. This is a mock sign-in for
              development only.
            </p>
          </div>

          <LoginForm next={next} />
        </div>
      </div>
      <p className="mt-8 text-label-sm text-on-surface-variant/70">
        Development build — no real user accounts are created.
      </p>
    </div>
  );
}