import { useState, useEffect } from "react";
import { adminApi, billingApi } from "../api/endpoints";
import Spinner from "../components/Spinner";
import Button from "../components/Button";
import { SelectInput, TextInput } from "../components/FormField";

const TABS = ["Revenue", "Orders", "Subscriptions", "Users", "Audit Logs"];

export default function AdminSystemPage() {
  const [activeTab, setActiveTab] = useState("Revenue");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
        System administration
      </h1>
      <p className="mt-1 text-[var(--color-slate)]">Manage users, payments, subscriptions, and audit logs.</p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-[var(--color-slate-light)]/30">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
        {activeTab === "Revenue"      && <RevenuePanel />}
        {activeTab === "Orders"       && <OrdersPanel />}
        {activeTab === "Subscriptions"&& <SubscriptionsPanel />}
        {activeTab === "Users"        && <UsersPanel />}
        {activeTab === "Audit Logs"   && <AuditLogPanel />}
      </div>
    </div>
  );
}

// ─── Revenue ─────────────────────────────────────────────────────────────────
function RevenuePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");

  const load = () => {
    setLoading(true);
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to   = dateTo;
    billingApi.getRevenue(params).then(({ data }) => setData(data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--color-slate)] mb-1">From</label>
          <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-slate)] mb-1">To</label>
          <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={load}>Apply</Button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RevStat label="Total Revenue" value={`KES ${Number(data.total_revenue).toLocaleString()}`} highlight />
          <RevStat label="Total Orders" value={data.total_orders} />
          <RevStat label="Paid Orders" value={data.paid_orders} good />
          <RevStat label="Failed Orders" value={data.failed_orders} bad />
        </div>
      )}
    </div>
  );
}

function RevStat({ label, value, highlight, good, bad }) {
  return (
    <div className={`rounded-sm p-5 ${highlight ? "bg-[var(--color-ink)] text-white" : "border border-[var(--color-slate-light)]/30 bg-white"}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-white/60" : "text-[var(--color-slate)]"}`}>{label}</p>
      <p className={`mt-1 font-[var(--font-display)] text-2xl font-semibold ${
        highlight ? "text-white" : good ? "text-[var(--color-ledger)]" : bad ? "text-[var(--color-brick)]" : "text-[var(--color-ink)]"
      }`}>{value}</p>
    </div>
  );
}

// ─── Orders ──────────────────────────────────────────────────────────────────
function OrdersPanel() {
  const [orders, setOrders] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    billingApi.adminGetOrders(statusFilter ? { status: statusFilter } : {})
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const STATUS_COLOR = {
    PAID: "bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]",
    PENDING: "bg-[var(--color-paper-dim)] text-[var(--color-slate)]",
    FAILED: "bg-[var(--color-brick-bg)] text-[var(--color-brick)]",
    REFUNDED: "bg-[var(--color-amber-bg)] text-[var(--color-amber)]",
  };

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </SelectInput>
      </div>
      {loading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> : (
        <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Order ID</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">User</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Product</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Amount</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Provider</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-slate-light)]/20">
              {orders?.results?.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--color-paper-dim)]/60">
                  <td className="case-number px-4 py-3 text-xs text-[var(--color-slate)]">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-[var(--color-ink)]">{o.user?.email || "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{o.product_name}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">KES {Number(o.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{o.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`tab-badge text-xs ${STATUS_COLOR[o.status] || STATUS_COLOR.PENDING}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-slate)]">
                    {new Date(o.created_at).toLocaleDateString("en-KE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!orders?.results?.length) && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-slate)]">No orders found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
function SubscriptionsPanel() {
  const [subs, setSubs] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    billingApi.adminGetSubscriptions(statusFilter ? { status: statusFilter } : {})
      .then(({ data }) => setSubs(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const STATUS_COLOR = {
    ACTIVE: "bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]",
    EXPIRED: "bg-[var(--color-paper-dim)] text-[var(--color-slate)]",
    CANCELLED: "bg-[var(--color-brick-bg)] text-[var(--color-brick)]",
  };

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </SelectInput>
      </div>
      {loading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> : (
        <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">User</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Plan</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Expires</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Days left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-slate-light)]/20">
              {subs?.results?.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-paper-dim)]/60">
                  <td className="px-4 py-3 text-[var(--color-ink)]">{s.user?.email || "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{s.product_name}</td>
                  <td className="px-4 py-3">
                    <span className={`tab-badge text-xs ${STATUS_COLOR[s.status] || STATUS_COLOR.EXPIRED}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">
                    {new Date(s.ends_at).toLocaleDateString("en-KE")}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">{s.days_remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!subs?.results?.length) && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-slate)]">No subscriptions found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function UsersPanel() {
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getUsers(roleFilter ? { role: roleFilter } : {})
      .then(({ data }) => setUsers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [roleFilter]);

  const handleToggleActive = async (u) => {
    const { data } = await adminApi.updateUser(u.id, { is_active: !u.is_active });
    setUsers((prev) => ({ ...prev, results: prev.results.map((r) => r.id === u.id ? data : r) }));
  };

  const handleRoleChange = async (u, role) => {
    const { data } = await adminApi.updateUser(u.id, { role });
    setUsers((prev) => ({ ...prev, results: prev.results.map((r) => r.id === u.id ? data : r) }));
  };

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <SelectInput value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="PUBLIC">Public</option>
          <option value="ADVOCATE">Advocate</option>
          <option value="COURT_ADMIN">Court Admin</option>
          <option value="SYS_ADMIN">System Admin</option>
        </SelectInput>
      </div>
      {loading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> : (
        <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Name</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Email</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Role</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-slate-light)]/20">
              {users?.results?.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--color-paper-dim)]/60">
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">{u.full_name}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <SelectInput
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="py-1 text-xs w-36"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="ADVOCATE">Advocate</option>
                      <option value="COURT_ADMIN">Court Admin</option>
                      <option value="SYS_ADMIN">System Admin</option>
                    </SelectInput>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.is_active ? "text-[var(--color-ledger)] font-medium" : "text-[var(--color-brick)] font-medium"}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="text-sm font-medium text-[var(--color-ink)] underline underline-offset-4"
                    >
                      {u.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!users?.results?.length) && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-slate)]">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
function AuditLogPanel() {
  const [logs, setLogs] = useState(null);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (actionFilter) params.action = actionFilter;
    if (dateFrom) params.date_from = dateFrom;
    adminApi.getAuditLogs(params).then(({ data }) => setLogs(data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [actionFilter, dateFrom]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="max-w-xs">
          <SelectInput value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All actions</option>
            <option value="CREATE_CASE">Create case</option>
            <option value="UPDATE_CASE">Update case</option>
            <option value="CREATE_CASE_EVENT">Add event</option>
            <option value="UPLOAD_DOCUMENT">Upload document</option>
          </SelectInput>
        </div>
        <div>
          <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" placeholder="From date" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={28} /></div> : (
        <ul className="divide-y divide-[var(--color-slate-light)]/20 rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
          {logs?.results?.map((log) => (
            <li key={log.id} className="px-4 py-3">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="flex w-full items-center justify-between text-left text-sm gap-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-[var(--color-slate)]">{new Date(log.created_at).toLocaleString("en-KE")}</span>{" · "}
                  <span className="font-semibold text-[var(--color-ink)]">{log.actor_email}</span>{" · "}
                  <span className="text-[var(--color-slate)]">{log.action}</span>{" "}
                  <span className="case-number text-xs text-[var(--color-slate-light)]">{log.entity_type}/{String(log.entity_id).slice(0, 8)}</span>
                </span>
                <span className="shrink-0 text-[var(--color-slate-light)]">{expanded === log.id ? "▲" : "▼"}</span>
              </button>
              {expanded === log.id && (
                <div className="mt-3 grid gap-3 rounded-sm bg-[var(--color-paper-dim)] p-3 text-xs sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-[var(--color-slate)] mb-1">Before</p>
                    <pre className="overflow-x-auto font-mono text-[var(--color-ink)] whitespace-pre-wrap">
                      {JSON.stringify(log.before_state, null, 2) || "null"}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-slate)] mb-1">After</p>
                    <pre className="overflow-x-auto font-mono text-[var(--color-ink)] whitespace-pre-wrap">
                      {JSON.stringify(log.after_state, null, 2) || "null"}
                    </pre>
                  </div>
                </div>
              )}
            </li>
          ))}
          {(!logs?.results?.length) && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-slate)]">No audit log entries found.</p>
          )}
        </ul>
      )}
    </div>
  );
}
