export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-ink)]/10 bg-[var(--color-paper-dim)] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-[var(--color-slate)]">
          © 2025 Kenya Court Case Tracker. Case data shown is for demonstration purposes.
        </p>
        <div className="flex gap-6 text-sm text-[var(--color-slate)]">
          <a href="#" className="hover:text-[var(--color-ink)]">About</a>
          <a href="#" className="hover:text-[var(--color-ink)]">Privacy Policy</a>
          <a href="#" className="hover:text-[var(--color-ink)]">Terms of Service</a>
          <a href="#" className="hover:text-[var(--color-ink)]">Contact</a>
        </div>
      </div>
    </footer>
  );
}
