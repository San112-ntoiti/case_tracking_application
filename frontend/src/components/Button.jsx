/** Reusable button with variant styling. */
export default function Button({ variant = "primary", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary:   "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-light)]",
    brass:     "bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)]",
    outline:   "border border-[var(--color-ink)]/30 text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5",
    ghost:     "text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5",
    danger:    "bg-[var(--color-brick)] text-white hover:opacity-90",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
