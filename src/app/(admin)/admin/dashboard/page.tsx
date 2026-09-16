import { Icon } from "@/components/ui/icon";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-headline-xl text-on-surface">Admin Dashboard</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Clinic administration
      </p>
      <div className="mt-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <Icon name="construction" size="md" />
          </div>
          <div>
            <h2 className="text-headline-sm text-on-surface">Coming Soon</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Admin features will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}