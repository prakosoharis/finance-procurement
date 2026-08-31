import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-text">
      <p className="text-sm text-muted">404 — page not found</p>
      <Link href="/" className="text-sm text-teal hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
