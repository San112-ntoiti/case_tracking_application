import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div>
      {/* Hero — the thesis: a real case file being looked up */}
      <section  className="border-b border-[var(--color-ink)]/10 text-white"
  style={{
    animation: "fadeIn 1s ease-in-out",
    transform: "translateZ(1)",  // Fixes a Safari rendering bug with the background gradient
    background: `linear-gradient(
      rgba(var(--color-ink-rgb, 13, 42, 74), 0.65), 
      rgba(var(--color-ink-rgb, 13, 42, 74), 0.65)
    ), url('/hero.png') center/cover no-repeat`
  }}
>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-brass)]">
                For litigants, advocates &amp; court staff
              </p>
              <h1 className="font-[var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
                Know where your case stands, without the trip to court.
              </h1>
              <p className="mt-5 max-w-lg text-base text-white/75">
                Search any case by number, party, or advocate. Track hearing dates,
                get notified before mentions, and access case documents — all from
                your phone.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/search"
                  className="rounded-sm bg-[var(--color-brass)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-brass-dark)]"
                >
                  Search a case
                </Link>
                <Link
                  to="/pricing"
                  className="rounded-sm border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  View pricing
                </Link>
              </div>
            </div>

            {/* Signature element preview: a case-file tab card */}
            <div className="rounded-sm bg-white p-6 text-[var(--color-ink)] shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="case-number text-sm text-[var(--color-slate)]">HCCC E001/2025</span>
                <span className="tab-badge bg-[var(--color-ink)]/10 text-[var(--color-ink)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink)]" />
                  Hearing
                </span>
              </div>
              <h3 className="font-[var(--font-display)] text-lg font-semibold">
                Kamau &amp; Sons Ltd v. BuildRight Kenya Ltd
              </h3>
              <p className="mt-1 text-sm text-[var(--color-slate)]">Nairobi High Court — Civil</p>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-paper-dim)] pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Next mention</p>
                  <p className="mt-0.5 font-medium">14 Jul 2026</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Next hearing</p>
                  <p className="mt-0.5 font-medium">21 Jul 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
          How it works
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <HowItWorksCard
            label="Search"
            title="Find your case"
            description="Look up by case number, your name, your advocate, or court station — public and free."
          />
          <HowItWorksCard
            label="Track"
            title="Save it to your list"
            description="Keep an eye on cases that matter to you, with their full hearing history in one place."
          />
          <HowItWorksCard
            label="Get notified"
            title="Never miss a date"
            description="Subscribe for SMS, email, or WhatsApp reminders 24 hours before any hearing."
          />
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-[var(--color-paper-dim)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
            Simple, transparent pricing
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <PricingPreviewCard
              name="Free"
              price="KES 0"
              features={["Unlimited case search", "Track 1 case", "Public documents"]}
            />
            <PricingPreviewCard
              name="Premium Monthly"
              price="KES 500"
              period="/month"
              highlighted
              features={["Unlimited tracking", "SMS & email alerts", "Premium documents", "PDF reports"]}
            />
            <PricingPreviewCard
              name="Premium Annual"
              price="KES 4,800"
              period="/year"
              features={["Everything in Monthly", "20% savings", "Priority support"]}
            />
          </div>
          <div className="mt-8 text-center">
            <Link to="/pricing" className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
              See full plan comparison →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HowItWorksCard({ label, title, description }) {
  return (
    <div className="rounded-sm border-t-2 border-[var(--color-brass)] bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brass-dark)]">{label}</p>
      <h3 className="mt-2 font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-slate)]">{description}</p>
    </div>
  );
}

function PricingPreviewCard({ name, price, period, features, highlighted }) {
  return (
    <div
      className={`rounded-sm p-6 ${
        highlighted
          ? "bg-[var(--color-ink)] text-white shadow-lg"
          : "border border-[var(--color-slate-light)]/30 bg-white"
      }`}
    >
      {highlighted && (
        <span className="tab-badge mb-3 bg-[var(--color-brass)] text-[var(--color-ink)]">Most popular</span>
      )}
      <h3 className={`font-[var(--font-display)] text-lg font-semibold ${highlighted ? "text-white" : "text-[var(--color-ink)]"}`}>
        {name}
      </h3>
      <p className="mt-1">
        <span className="text-2xl font-semibold">{price}</span>
        {period && <span className={highlighted ? "text-white/60" : "text-[var(--color-slate)]"}> {period}</span>}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className={`flex items-start gap-2 ${highlighted ? "text-white/85" : "text-[var(--color-slate)]"}`}>
            <span className={highlighted ? "text-[var(--color-brass)]" : "text-[var(--color-ledger)]"}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
