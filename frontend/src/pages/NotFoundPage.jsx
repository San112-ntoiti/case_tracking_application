import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="case-number text-sm text-[var(--color-slate)]">404</p>
      <h1 className="mt-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-[var(--color-slate)]">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="mt-6 text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
        ← Back to home
      </Link>
    </div>
  );
}
