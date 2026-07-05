import { useState, useEffect } from "react";
import { authApi, billingApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import FormField, { TextInput } from "../components/FormField";
import Spinner from "../components/Spinner";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    billingApi.getSubscription()
      .then(({ data }) => setSubscription(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner size={28} /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
        Account settings
      </h1>

      <div className="mt-6 flex gap-6 border-b border-[var(--color-slate-light)]/30">
        {["profile", "password", "subscription"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium capitalize transition-colors ${
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
        {activeTab === "profile"       && <ProfileTab user={user} onSave={refreshUser} />}
        {activeTab === "password"      && <PasswordTab />}
        {activeTab === "subscription"  && <SubscriptionTab subscription={subscription} setSubscription={setSubscription} />}
      </div>
    </div>
  );
}

function ProfileTab({ user, onSave }) {
  const [form, setForm] = useState({ full_name: user?.full_name || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await authApi.updateProfile(form);
      await onSave();
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {message && (
        <div className={`rounded-sm px-4 py-3 text-sm ${message.includes("success") ? "bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]" : "bg-[var(--color-brick-bg)] text-[var(--color-brick)]"}`}>
          {message}
        </div>
      )}
      <div className="rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5 space-y-4">
        <FormField label="Email address">
          <TextInput value={user?.email} disabled className="opacity-60 cursor-not-allowed" />
          <p className="mt-1 text-xs text-[var(--color-slate)]">Email cannot be changed.</p>
        </FormField>
        <FormField label="Full name">
          <TextInput
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Phone number" hint="Used for M-Pesa payments and SMS notifications.">
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="254712345678"
          />
        </FormField>
        <div className="rounded-sm bg-[var(--color-paper-dim)] px-4 py-3 text-sm text-[var(--color-slate)]">
          <span className="font-medium text-[var(--color-ink)]">Role: </span>{user?.role}
        </div>
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

function PasswordTab() {
  const [form, setForm] = useState({ old_password: "", new_password: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await authApi.changePassword(form);
      setMessage("Password changed successfully. Please sign in again.");
      setForm({ old_password: "", new_password: "" });
    } catch (err) {
      setMessage(err.response?.data?.message || "Password change failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div className={`rounded-sm px-4 py-3 text-sm ${message.includes("success") ? "bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]" : "bg-[var(--color-brick-bg)] text-[var(--color-brick)]"}`}>
          {message}
        </div>
      )}
      <div className="rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5 space-y-4">
        <FormField label="Current password">
          <TextInput type="password" required value={form.old_password} onChange={(e) => setForm({ ...form, old_password: e.target.value })} />
        </FormField>
        <FormField label="New password" hint="At least 8 characters.">
          <TextInput type="password" required value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
        </FormField>
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Changing…" : "Change password"}</Button>
    </form>
  );
}

function SubscriptionTab({ subscription, setSubscription }) {
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");

  const handleCancel = async () => {
    if (!window.confirm("Cancel your subscription? You keep access until the expiry date.")) return;
    setCancelling(true);
    try {
      const { data } = await billingApi.cancelSubscription();
      setMessage(`Subscription cancelled. Access continues until ${new Date(data.ends_at).toLocaleDateString("en-KE")}.`);
      setSubscription({ ...subscription, subscription: { ...subscription.subscription, status: "CANCELLED" } });
    } catch (err) {
      setMessage(err.response?.data?.message || "Cancellation failed.");
    } finally {
      setCancelling(false);
    }
  };

  if (!subscription?.active) {
    return (
      <div className="rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-6 text-center">
        <p className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">No active subscription</p>
        <p className="mt-2 text-sm text-[var(--color-slate)]">You are on the free plan. Upgrade for unlimited tracking and notifications.</p>
        <a href="/pricing" className="mt-4 inline-block rounded-sm bg-[var(--color-brass)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-brass-dark)]">
          View plans
        </a>
      </div>
    );
  }

  const sub = subscription.subscription;

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-sm bg-[var(--color-ledger-bg)] px-4 py-3 text-sm text-[var(--color-ledger)]">
          {message}
        </div>
      )}
      <div className="rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">{sub.product_name}</h3>
          <span className="tab-badge bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ledger)]" />
            {sub.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-paper-dim)] pt-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">Started</p>
            <p className="mt-0.5 text-[var(--color-ink)]">{new Date(sub.starts_at).toLocaleDateString("en-KE")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">Expires</p>
            <p className="mt-0.5 text-[var(--color-ink)]">{new Date(sub.ends_at).toLocaleDateString("en-KE")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">Days remaining</p>
            <p className="mt-0.5 font-semibold text-[var(--color-ink)]">{sub.days_remaining}</p>
          </div>
        </div>
        <div className="border-t border-[var(--color-paper-dim)] pt-4">
          <p className="mb-3 text-xs text-[var(--color-slate)]">
            Cancelling ends auto-renewal. You keep premium access until the expiry date.
          </p>
          {sub.status === "ACTIVE" && (
            <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
