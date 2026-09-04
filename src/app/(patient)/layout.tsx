import Link from "next/link";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            QueueLess
          </Link>
          <span className="text-sm text-gray-500">Patient Portal</span>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
