/**
 * NotificationCenter
 * Full notification management page:
 * - Notification history (all channels, all statuses)
 * - Channel preferences (email / SMS / WhatsApp toggles)
 * - "Send test notification" to demonstrate the pipeline works
 * - Manual mark-as-sent for demo purposes
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { notificationsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";

const CHANNEL_ICONS = {
  EMAIL:    { icon: "✉", label: "Email",    color: "text-[var(--color-ink)]" },
  SMS:      { icon: "📱", label: "SMS",      color: "text-[var(--color-ledger)]" },
  WHATSAPP: { icon: "💬", label: "WhatsApp", color: "text-[var(--color-ledger)]" },
};

const STATUS_STYLES = {
  QUEUED:             "bg-[var(--color-paper-dim)] text-[var(--color-slate)]",
  SENT:               "bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]",
  FAILED:             "bg-[var(--color-brick-bg)] text-[var(--color-brick)]",
  PERMANENTLY_FAILED: "bg-[var(--color-brick-bg)] text-[var(--color-brick)]",
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [activeTab, setActiveTab] = useState("notifications"); // notifications | preferences

  const loadData = useCallback(() => {
    Promise.all([notificationsApi.list(), notificationsApi.getPreferences()])
      .then(([nRes, pRes]) => {
        setNotifications(nRes.data);
        setPrefs(pRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrefToggle = async (field) => {
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);
    setSavingPrefs(true);
    try {
      await notificationsApi.updatePreferences({ [field]: !prefs[field] });
    } catch {
      setPrefs(prefs); // revert on error
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestMessage("");
    try {
      const { data } = await notificationsApi.sendTest();
      setTestMessage(data.message);
      loadData(); // refresh the list to show the new notification
    } catch (err) {
      setTestMessage(err.response?.data?.message || "Test failed — track a case first.");
    } finally {
      setTestLoading(false);
    }
  };

  const handleMarkSent = async (id) => {
    await notificationsApi.markSent(id);
    setNotifications((prev) => ({
      ...prev,
      results: prev.results.map((n) =>
        n.id === id ? { ...n, status: "SENT" } : n
      ),
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Alerts for case updates and upcoming hearing dates.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testLoading}
        >
          {testLoading ? "Sending…" : "Send test notification"}
        </Button>
      </div>

      {testMessage && (
        <div className="mt-4 rounded-sm bg-[var(--color-ledger-bg)] px-4 py-3 text-sm text-[var(--color-ledger)]">
          {testMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-6 border-b border-[var(--color-slate-light)]/30">
        {[
          { key: "notifications", label: `History (${notifications?.count ?? 0})` },
          { key: "preferences",   label: "Channel Preferences" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-[var(--color-brass)] text-[var(--color-ink)]"
                : "border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="py-6">
        {activeTab === "notifications" && (
          <NotificationList
            notifications={notifications}
            onMarkSent={handleMarkSent}
          />
        )}
        {activeTab === "preferences" && (
          <PreferencesPanel
            prefs={prefs}
            onToggle={handlePrefToggle}
            saving={savingPrefs}
          />
        )}
      </div>
    </div>
  );
}

function NotificationList({ notifications, onMarkSent }) {
  const items = notifications?.results || [];
  if (!items.length) {
    return (
      <EmptyState
        title="No notifications yet"
        description="When a case you track is updated or a hearing is approaching, alerts will appear here."
        action={
          <Link to="/search">
            <Button variant="outline">Search and track a case</Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-slate-light)]/20 rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
      {items.map((n) => {
        const ch = CHANNEL_ICONS[n.channel] || CHANNEL_ICONS.EMAIL;
        return (
          <li key={n.id} className="flex items-start gap-4 px-4 py-4">
            <span className={`mt-0.5 text-lg ${ch.color}`} aria-hidden="true">
              {ch.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                  {ch.label}
                </span>
                <span className={`tab-badge text-xs ${STATUS_STYLES[n.status] || STATUS_STYLES.QUEUED}`}>
                  {n.status.replace("_", " ")}
                </span>
                {n.case_number && (
                  <span className="case-number text-xs text-[var(--color-slate-light)]">
                    {n.case_number}
                  </span>
                )}
              </div>
              {n.subject && (
                <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{n.subject}</p>
              )}
              <p className="mt-0.5 text-sm text-[var(--color-slate)]">{n.message}</p>
              <p className="mt-1 text-xs text-[var(--color-slate-light)]">
                {new Date(n.created_at).toLocaleString("en-KE")}
                {n.sent_at && ` · Sent ${new Date(n.sent_at).toLocaleString("en-KE")}`}
              </p>
            </div>
            {n.status === "QUEUED" && (
              <button
                onClick={() => onMarkSent(n.id)}
                className="shrink-0 text-xs font-medium text-[var(--color-ink)] underline underline-offset-4"
                title="Mark as sent (demo)"
              >
                Mark sent
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PreferencesPanel({ prefs, onToggle, saving }) {
  if (!prefs) return null;

  const channels = [
    {
      key: "notify_email",
      label: "Email notifications",
      icon: "✉",
      description: "Receive case updates and hearing reminders via email.",
    },
    {
      key: "notify_sms",
      label: "SMS notifications",
      icon: "📱",
      description: "Receive SMS alerts to your registered phone number (Africa's Talking).",
    },
    {
      key: "notify_whatsapp",
      label: "WhatsApp notifications",
      icon: "💬",
      description: "Receive WhatsApp messages via Twilio. Your number must be registered.",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-slate)]">
        Choose how you want to receive alerts when a tracked case is updated or a hearing is approaching.
        {saving && <span className="ml-2 text-xs text-[var(--color-brass-dark)]">Saving…</span>}
      </p>

      <div className="divide-y divide-[var(--color-slate-light)]/20 rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
        {channels.map(({ key, label, icon, description }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">{icon}</span>
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
                <p className="text-xs text-[var(--color-slate)]">{description}</p>
              </div>
            </div>
            <button
              onClick={() => onToggle(key)}
              disabled={saving}
              className={`relative h-6 w-11 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brass)] disabled:opacity-50 ${
                prefs[key] ? "bg-[var(--color-ink)]" : "bg-[var(--color-slate-light)]/40"
              }`}
              role="switch"
              aria-checked={prefs[key]}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[key] ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)] p-4 text-sm text-[var(--color-slate)]">
        <p className="font-medium text-[var(--color-ink)]">How notifications work</p>
        <p className="mt-1">
          When a Court Administrator updates a case you're tracking, the system immediately
          queues a notification on every channel you have enabled. Celery (the background task
          worker) dispatches these via SendGrid (email), Africa's Talking (SMS), and Twilio
          (WhatsApp). In the development environment, notifications are queued to the database
          and can be triggered manually using the "Send test notification" button above.
        </p>
      </div>
    </div>
  );
}
