import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { casesApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

const TABS = ["Overview", "History", "Documents"];

export default function CaseDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, hasPremium } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [isTracked, setIsTracked] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([casesApi.getDetail(id), casesApi.getEvents(id)])
      .then(([detailRes, eventsRes]) => {
        setCaseData(detailRes.data);
        setIsTracked(detailRes.data.is_tracked);
        setEvents(eventsRes.data.results || eventsRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleTrack = async () => {
    setTrackError("");
    setTrackLoading(true);
    try {
      await casesApi.trackCase(id);
      setIsTracked(true);
    } catch (err) {
      if (err.response?.status === 403) {
        setTrackError(err.response.data.message);
      } else {
        setTrackError("Could not track this case. Please try again.");
      }
    } finally {
      setTrackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
          Case not found
        </h1>
        <Link to="/search" className="mt-3 inline-block text-sm font-semibold text-[var(--color-ink)] underline">
          ← Back to search
        </Link>
      </div>
    );
  }

  const upcomingSoon = (dateStr) => {
    if (!dateStr) return false;
    const days = (new Date(dateStr) - new Date()) / 86400000;
    return days >= 0 && days <= 7;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/search" className="text-sm font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)]">
        ← Back to search
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 border-b border-[var(--color-slate-light)]/30 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="case-number text-sm text-[var(--color-slate)]">{caseData.case_number}</span>
            <StatusBadge status={caseData.status} />
            {caseData.verified && (
              <span className="rounded-full bg-[var(--color-ledger-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-ledger)]">
                Verified record
              </span>
            )}
          </div>
          <h1 className="mt-2 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            {caseData.parties?.map((p) => p.party_name).join(" v. ") || caseData.case_type}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            {caseData.court?.name} · {caseData.case_type}
            {caseData.judge_name && ` · ${caseData.judge_name}`}
          </p>
        </div>

        <div className="shrink-0">
          {!isAuthenticated ? (
            <Link to="/login">
              <Button variant="outline">Sign in to track</Button>
            </Link>
          ) : isTracked ? (
            <Button variant="outline" disabled>✓ Tracking</Button>
          ) : (
            <Button variant="brass" onClick={handleTrack} disabled={trackLoading}>
              {trackLoading ? "Tracking…" : "Track this case"}
            </Button>
          )}
          {trackError && (
            <p className="mt-2 max-w-xs text-right text-xs text-[var(--color-brick)]">
              {trackError}{" "}
              {trackError.includes("Subscribe") && (
                <Link to="/pricing" className="underline">Upgrade →</Link>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div>
          {/* Tabs */}
          <div className="flex gap-6 border-b border-[var(--color-slate-light)]/30">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-[var(--color-brass)] text-[var(--color-ink)]"
                    : "border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="py-6">
            {activeTab === "Overview" && <OverviewTab caseData={caseData} />}
            {activeTab === "History" && <HistoryTab events={events} />}
            {activeTab === "Documents" && <DocumentsTab documents={caseData.documents} hasPremium={hasPremium} />}
          </div>
        </div>

        {/* Sidebar: upcoming dates */}
        <aside className="space-y-3">
          <DateCard label="Next mention" date={caseData.next_mention_date} urgent={upcomingSoon(caseData.next_mention_date)} />
          <DateCard label="Next hearing" date={caseData.next_hearing_date} urgent={upcomingSoon(caseData.next_hearing_date)} />
        </aside>
      </div>
    </div>
  );
}

function DateCard({ label, date, urgent }) {
  return (
    <div className={`rounded-sm border p-4 ${urgent ? "border-[var(--color-amber)]/40 bg-[var(--color-amber-bg)]" : "border-[var(--color-slate-light)]/30 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
        {date || "Not scheduled"}
      </p>
      {urgent && <p className="mt-1 text-xs font-medium text-[var(--color-amber)]">Within 7 days</p>}
    </div>
  );
}

function OverviewTab({ caseData }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-slate)]">Parties</h3>
        <ul className="mt-2 space-y-2">
          {caseData.parties?.map((p) => (
            <li key={p.id} className="text-sm">
              <span className="font-medium text-[var(--color-ink)]">{p.party_name}</span>
              <span className="ml-2 text-[var(--color-slate)]">{p.party_role}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-slate)]">Advocates</h3>
        <ul className="mt-2 space-y-2">
          {caseData.advocates?.length ? caseData.advocates.map((a) => (
            <li key={a.id} className="text-sm">
              <span className="font-medium text-[var(--color-ink)]">{a.advocate_name}</span>
              {a.law_firm && <span className="ml-2 text-[var(--color-slate)]">{a.law_firm}</span>}
            </li>
          )) : <li className="text-sm text-[var(--color-slate)]">None recorded</li>}
        </ul>
      </div>
      {caseData.public_summary && (
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-slate)]">Summary</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">{caseData.public_summary}</p>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ events }) {
  if (!events.length) {
    return <p className="text-sm text-[var(--color-slate)]">No events recorded yet.</p>;
  }
  return (
    <ol className="relative space-y-6 border-l-2 border-[var(--color-brass)]/40 pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[1.78rem] top-1 h-3 w-3 rounded-full bg-[var(--color-brass)]" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
            {e.event_date} · {e.event_type}
          </p>
          {e.notes && <p className="mt-1 text-sm text-[var(--color-ink)]">{e.notes}</p>}
          <p className="mt-0.5 text-xs text-[var(--color-slate-light)]">Logged by {e.created_by_name}</p>
        </li>
      ))}
    </ol>
  );
}

function DocumentsTab({ documents, hasPremium }) {
  if (!documents?.length) {
    return <p className="text-sm text-[var(--color-slate)]">No documents available for this case.</p>;
  }
  return (
    <ul className="space-y-3">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between rounded-sm border border-[var(--color-slate-light)]/30 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <DocIcon locked={d.is_locked} />
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">{d.title}</p>
              <p className="text-xs text-[var(--color-slate)]">{d.access_level === "PREMIUM" ? "Premium document" : "Public document"}</p>
            </div>
          </div>
          {d.is_locked ? (
            <Link to="/pricing" className="text-sm font-semibold text-[var(--color-brass-dark)] underline underline-offset-4">
              Subscribe to download
            </Link>
          ) : (
            <a href={d.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
              Download
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function DocIcon({ locked }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      className={locked ? "text-[var(--color-slate-light)]" : "text-[var(--color-ledger)]"}>
      {locked ? (
        <path d="M5 11V7a7 7 0 0114 0v4M5 11h14v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9z" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
