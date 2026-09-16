import Link from "next/link";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-semibold text-on-surface ${className}`}
      aria-label="QueueLess home"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="#0d9488" />
        <path
          d="M16 8v16M8 16h16"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="24" cy="8" r="3" fill="#38bdf8" />
      </svg>
      <span className="text-lg tracking-tight">QueueLess</span>
    </Link>
  );
}