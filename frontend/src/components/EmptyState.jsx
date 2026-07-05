/** Empty state — an invitation to act, per design guidance, never a dead end. */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-[var(--color-slate-light)]/40 bg-white px-6 py-16 text-center">
      {icon && <div className="mb-4 text-[var(--color-slate-light)]">{icon}</div>}
      <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[var(--color-slate)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
