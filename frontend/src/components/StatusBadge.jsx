/**
 * StatusBadge — the signature visual element of the app.
 * Renders a case status as a clipped-corner "case file tab" rather than
 * a generic rounded pill, referencing the physical manila folder tab.
 */
const STATUS_STYLES = {
  FILED:   { bg: "bg-[var(--color-paper-dim)]", text: "text-[var(--color-slate)]", dot: "bg-[var(--color-slate)]" },
  MENTION: { bg: "bg-[var(--color-amber-bg)]",  text: "text-[var(--color-amber)]", dot: "bg-[var(--color-amber)]" },
  HEARING: { bg: "bg-[var(--color-ink)]/10",    text: "text-[var(--color-ink)]",   dot: "bg-[var(--color-ink)]" },
  RULING:  { bg: "bg-[var(--color-brass)]/15",  text: "text-[var(--color-brass-dark)]", dot: "bg-[var(--color-brass)]" },
  CLOSED:  { bg: "bg-[var(--color-ledger-bg)]", text: "text-[var(--color-ledger)]", dot: "bg-[var(--color-ledger)]" },
  STAYED:  { bg: "bg-[var(--color-brick-bg)]",  text: "text-[var(--color-brick)]", dot: "bg-[var(--color-brick)]" },
};

const STATUS_LABELS = {
  FILED: "Filed",
  MENTION: "Mention",
  HEARING: "Hearing",
  RULING: "Ruling",
  CLOSED: "Closed",
  STAYED: "Stayed",
};

export default function StatusBadge({ status, className = "" }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.FILED;
  return (
    <span className={`tab-badge ${style.bg} ${style.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
