/**
 * AdvocateDashboard
 * Purpose-built for the ADVOCATE role. Shows:
 * - All tracked cases grouped by upcoming hearing date
 * - A 7-day hearing calendar view
 * - PDF and CSV report generation
 * - Subscription status and upgrade prompt
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { casesApi, billingApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import { downloadBlob } from "../utils/download";

export default function AdvocateDashboard() {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [view, setView] = useState("list"); // list | calendar

  useEffect(() => {
    Promise.all([casesApi.getTracked(), billingApi.getSubscription()])
      .then(([t, s]) => {
        setTracked(t.data);
        setSubscription(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUntrack = async (trackedId) => {
    await casesApi.untrackCase(trackedId);
    setTracked((prev) => ({
      ...prev,
      count: prev.count - 1,
      results: prev.results.filter((r) => r.id !== trackedId),
    }));
  };

  const handleDownload = async (fmt) => {
    setDownloading(fmt);
    try {
      const resp =
        fmt === "pdf"
          ? await casesApi.downloadTrackedPDF()
          : await casesApi.downloadTrackedCSV();
      downloadBlob(resp.data, `tracked_cases.${fmt}`);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  const cases = tracked?.results || [];
  const now = new Date();

  // Group cases with upcoming hearings within 7 days
  const upcoming = cases.filter((t) => {
    const d = t.case_detail?.next_hearing_date;
    if (!d) return false;
    const diff = (new Date(d) - now) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
            Advocate Portal
          </h1>
          <p className="mt-1 text-[var(--color-slate)]">
            Welcome, {user?.full_name}. Manage your caseload and generate reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleDownload("csv")}
            disabled={!!downloading || !cases.length}
          >
            {downloading === "csv" ? "Downloading…" : "Export CSV"}
          </Button>
          <Button
            variant="brass"
            onClick={() => handleDownload("pdf")}
            disabled={!!downloading || !cases.length}
          >
            {downloading === "pdf" ? "Downloading…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Subscription status */}
      {!subscription?.active && (
        <div className="mt-6 flex flex-col gap-3 rounded-sm border border-[var(--color-brass)]/40 bg-[var(--color-amber-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[var(--color-ink)]">You are on the free plan</p>
            <p className="text-sm text-[var(--color-slate)]">
              Upgrade to track unlimited cases, receive SMS/email hearing reminders, and generate reports.
            </p>
          </div>
          <Link to="/pricing">
            <Button variant="brass" className="shrink-0">Upgrade to Premium</Button>
          </Link>
        </div>
      )}

      {subscription?.active && (
        <div className="mt-6 flex items-center gap-4 rounded-sm border border-[var(--color-ledger)]/30 bg-[var(--color-ledger-bg)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-ledger)]">
            ✓ {subscription.subscription.product_name} — {subscription.subscription.days_remaining} days remaining
          </span>
          <Link to="/settings" className="text-xs text-[var(--color-slate)] underline">
            Manage subscription
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Cases tracked" value={tracked?.count ?? 0} />
        <StatCard
          label="Upcoming hearings (7 days)"
          value={upcoming.length}
          urgent={upcoming.length > 0}
        />
        <StatCard
          label="Active matters"
          value={cases.filter((t) =>
            !["CLOSED", "STAYED"].includes(t.case_detail?.status)
          ).length}
        />
      </div>

      {/* 7-day hearing alert strip */}
      {upcoming.length > 0 && (
        <div className="mt-6 rounded-sm border border-[var(--color-amber)]/40 bg-[var(--color-amber-bg)] p-4">
          <h2 className="font-semibold text-[var(--color-amber)]">
            ⚠ Hearings within the next 7 days
          </h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="case-number font-medium text-[var(--color-ink)]">
                    {t.case_detail.case_number}
                  </span>
                  <span className="ml-2 text-[var(--color-slate)]">
                    {t.case_detail.court_name}
                  </span>
                </span>
                <span className="font-semibold text-[var(--color-amber)]">
                  {t.case_detail.next_hearing_date}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View toggle */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
          My tracked cases
        </h2>
        <div className="flex gap-1 rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-1">
          {["list", "calendar"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-slate)] hover:text-[var(--color-ink)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {!cases.length ? (
          <EmptyState
            title="No cases tracked yet"
            description="Search for cases where you appear as advocate and track them here."
            action={
              <Link to="/search">
                <Button>Search by advocate name</Button>
              </Link>
            }
          />
        ) : view === "list" ? (
          <ListView cases={cases} onUntrack={handleUntrack} />
        ) : (
          <CalendarView cases={cases} />
        )}
      </div>

      <div className="mt-8">
        <Link to="/search" className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
          + Track another case
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, urgent }) {
  return (
    <div
      className={`rounded-sm p-5 ${
        urgent && value > 0
          ? "bg-[var(--color-amber-bg)] border border-[var(--color-amber)]/30"
          : "bg-[var(--color-ink)] text-white"
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          urgent && value > 0 ? "text-[var(--color-amber)]" : "text-white/60"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-[var(--font-display)] text-3xl font-semibold ${
          urgent && value > 0 ? "text-[var(--color-amber)]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ListView({ cases, onUntrack }) {
  return (
    <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
          <tr>
            <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Case Number</th>
            <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] sm:table-cell">Court</th>
            <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
            <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] md:table-cell">
              Next Hearing
            </th>
            <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-slate-light)]/20">
          {cases.map((t) => {
            const hearingDate = t.case_detail?.next_hearing_date;
            const daysToHearing = hearingDate
              ? Math.ceil((new Date(hearingDate) - new Date()) / 86400000)
              : null;
            const urgent = daysToHearing !== null && daysToHearing >= 0 && daysToHearing <= 7;

            return (
              <tr
                key={t.id}
                className={`hover:bg-[var(--color-paper-dim)]/60 ${
                  urgent ? "bg-[var(--color-amber-bg)]/30" : ""
                }`}
              >
                <td className="px-4 py-3.5">
                  <Link
                    to={`/cases/${t.case_detail?.id}`}
                    className="case-number font-medium text-[var(--color-ink)] hover:underline"
                  >
                    {t.case_detail?.case_number}
                  </Link>
                </td>
                <td className="hidden px-4 py-3.5 text-[var(--color-slate)] sm:table-cell">
                  {t.case_detail?.court_name}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={t.case_detail?.status} />
                </td>
                <td className="hidden px-4 py-3.5 md:table-cell">
                  {hearingDate ? (
                    <span className={urgent ? "font-semibold text-[var(--color-amber)]" : "text-[var(--color-slate)]"}>
                      {hearingDate}
                      {urgent && <span className="ml-1 text-xs">({daysToHearing}d)</span>}
                    </span>
                  ) : (
                    <span className="text-[var(--color-slate-light)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/cases/${t.case_detail?.id}`}
                      className="text-sm font-medium text-[var(--color-ink)] underline underline-offset-4"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => onUntrack(t.id)}
                      className="text-sm font-medium text-[var(--color-brick)] hover:underline"
                    >
                      Untrack
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({ cases }) {
  // Build next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const fmt = (d) => d.toISOString().slice(0, 10);
  const label = (d) =>
    d.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" });

  const byDate = {};
  cases.forEach((t) => {
    const h = t.case_detail?.next_hearing_date;
    const m = t.case_detail?.next_mention_date;
    if (h) (byDate[h] = byDate[h] || []).push({ ...t, dateType: "hearing" });
    if (m && m !== h) (byDate[m] = byDate[m] || []).push({ ...t, dateType: "mention" });
  });

  return (
    <div className="grid gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const key = fmt(day);
        const isToday = key === fmt(new Date());
        const entries = byDate[key] || [];
        return (
          <div
            key={key}
            className={`min-h-[120px] rounded-sm border p-2 ${
              isToday
                ? "border-[var(--color-brass)] bg-[var(--color-brass)]/5"
                : "border-[var(--color-slate-light)]/30 bg-white"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                isToday ? "text-[var(--color-brass-dark)]" : "text-[var(--color-slate)]"
              }`}
            >
              {label(day)}
            </p>
            <div className="mt-2 space-y-1.5">
              {entries.map((e) => (
                <Link
                  key={e.id + e.dateType}
                  to={`/cases/${e.case_detail?.id}`}
                  className={`block rounded-sm px-1.5 py-1 text-xs font-medium leading-tight ${
                    e.dateType === "hearing"
                      ? "bg-[var(--color-ink)]/10 text-[var(--color-ink)]"
                      : "bg-[var(--color-amber-bg)] text-[var(--color-amber)]"
                  }`}
                >
                  <span className="case-number block truncate">{e.case_detail?.case_number}</span>
                  <span className="capitalize opacity-70">{e.dateType}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
