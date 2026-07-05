import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { casesApi, billingApi, notificationsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import Spinner from "../components/Spinner";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      casesApi.getTracked(),
      billingApi.getSubscription(),
      notificationsApi.list(),
    ])
      .then(([trackedRes, subRes, notifRes]) => {
        setTracked(trackedRes.data);
        setSubscription(subRes.data);
        setNotifications((notifRes.data.results || notifRes.data).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUntrack = async (trackedId) => {
    await casesApi.untrackCase(trackedId);
    setTracked((t) => ({ ...t, results: t.results.filter((r) => r.id !== trackedId), count: t.count - 1 }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  const upcomingCount = (tracked?.results || []).filter((t) => {
    const d = t.case_detail.next_hearing_date;
    if (!d) return false;
    const days = (new Date(d) - new Date()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
        Welcome back, {user?.full_name?.split(" ")[0]}
      </h1>

      {/* Stats bar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Cases tracked" value={tracked?.count ?? 0} />
        <StatCard
          label="Subscription"
          value={subscription?.active ? subscription.subscription.product_name : "Free"}
          sub={subscription?.active ? `${subscription.subscription.days_remaining} days left` : null}
        />
        <StatCard label="Upcoming hearings (7 days)" value={upcomingCount} />
      </div>

      {!subscription?.active && (
        <div className="mt-6 flex items-center justify-between rounded-sm border border-[var(--color-brass)]/40 bg-[var(--color-amber-bg)] px-5 py-4">
          <p className="text-sm text-[var(--color-ink)]">
            You're on the free plan — tracking is limited to 1 case. Upgrade for unlimited tracking and alerts.
          </p>
          <Link to="/pricing">
            <Button variant="brass" className="shrink-0">Upgrade</Button>
          </Link>
        </div>
      )}

      {/* Tracked cases table */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
          My tracked cases
        </h2>
        <Link to="/search" className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
          + Track another case
        </Link>
      </div>

      <div className="mt-4">
        {!tracked?.results?.length ? (
          <EmptyState
            title="No cases tracked yet"
            description="Search for a case and click 'Track this case' to follow its progress here."
            action={<Link to="/search"><Button>Search cases</Button></Link>}
          />
        ) : (
          <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Case Number</th>
                  <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] sm:table-cell">Court</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                  <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] md:table-cell">Next Hearing</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-slate-light)]/20">
                {tracked.results.map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--color-paper-dim)]/60">
                    <td className="case-number px-4 py-3.5 text-[var(--color-ink)]">
                      <Link to={`/cases/${t.case_detail.id}`} className="hover:underline">
                        {t.case_detail.case_number}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3.5 text-[var(--color-slate)] sm:table-cell">{t.case_detail.court_name}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={t.case_detail.status} /></td>
                    <td className="hidden px-4 py-3.5 text-[var(--color-slate)] md:table-cell">
                      {t.case_detail.next_hearing_date || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleUntrack(t.id)}
                        className="text-sm font-medium text-[var(--color-brick)] hover:underline"
                      >
                        Untrack
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notifications log */}
      {notifications.length > 0 && (
        <div className="mt-10">
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
            Recent notifications
          </h2>
          <ul className="mt-4 divide-y divide-[var(--color-slate-light)]/20 rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-medium text-[var(--color-ink)]">[{n.channel}]</span>{" "}
                  <span className="text-[var(--color-slate)]">{n.message}</span>
                </div>
                <NotificationStatusDot status={n.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-sm bg-[var(--color-ink)] p-5 text-white">
      <p className="text-xs font-medium uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-brass)]">{sub}</p>}
    </div>
  );
}

function NotificationStatusDot({ status }) {
  const colors = {
    SENT: "bg-[var(--color-ledger)] text-[var(--color-ledger)]",
    QUEUED: "bg-[var(--color-slate)] text-[var(--color-slate)]",
    FAILED: "bg-[var(--color-brick)] text-[var(--color-brick)]",
    PERMANENTLY_FAILED: "bg-[var(--color-brick)] text-[var(--color-brick)]",
  };
  const cls = colors[status] || colors.QUEUED;
  return (
    <span className={`text-xs font-medium ${cls.split(" ")[1]}`}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${cls.split(" ")[0]}`} />
      {status}
    </span>
  );
}
