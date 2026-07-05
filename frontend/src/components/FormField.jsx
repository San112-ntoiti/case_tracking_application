/** Reusable labeled input field with error display. */
export default function FormField({ label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--color-ink)]">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--color-slate)]">{hint}</p>}
      {error && <p className="text-xs text-[var(--color-brick)]">{error}</p>}
    </div>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-sm border border-[var(--color-slate-light)]/50 bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-slate-light)] focus:border-[var(--color-ink)] ${props.className || ""}`}
    />
  );
}

export function SelectInput(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-sm border border-[var(--color-slate-light)]/50 bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] ${props.className || ""}`}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-sm border border-[var(--color-slate-light)]/50 bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-slate-light)] focus:border-[var(--color-ink)] ${props.className || ""}`}
    />
  );
}
