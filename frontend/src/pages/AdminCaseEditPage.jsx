import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { casesApi } from "../api/endpoints";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import FormField, { TextInput, SelectInput, TextArea } from "../components/FormField";

const STATUS_OPTIONS = ["FILED", "MENTION", "HEARING", "RULING", "CLOSED", "STAYED"];
const EVENT_TYPES = ["MENTION", "HEARING", "RULING", "ADJOURNMENT", "UPDATE", "FILING", "CLOSED"];

export default function AdminCaseEditPage() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const load = () => {
    Promise.all([casesApi.adminGet(id), casesApi.getEvents(id)]).then(([c, e]) => {
      setCaseData(c.data);
      setEvents(e.data.results || e.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleFieldUpdate = async (field, value) => {
    setSavingField(true);
    setSaveMsg("");
    try {
      const { data } = await casesApi.adminUpdate(id, { [field]: value });
      setCaseData((c) => ({ ...c, ...data }));
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2000);
    } finally {
      setSavingField(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner size={28} /></div>;
  if (!caseData) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/admin/cases" className="text-sm font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)]">
        ← Back to all cases
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="case-number text-sm text-[var(--color-slate)]">{caseData.case_number}</span>
        <StatusBadge status={caseData.status} />
        {caseData.verified && (
          <span className="rounded-full bg-[var(--color-ledger-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-ledger)]">
            Verified record
          </span>
        )}
        {saveMsg && <span className="text-xs font-medium text-[var(--color-ledger)]">✓ {saveMsg}</span>}
      </div>
      <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
        {caseData.case_type} — {caseData.court?.name}
      </h1>

      {/* Quick status / date update */}
      <div className="mt-6 grid gap-4 rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5 sm:grid-cols-3">
        <FormField label="Status">
          <SelectInput
            value={caseData.status}
            disabled={savingField}
            onChange={(e) => handleFieldUpdate("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="Next mention date">
          <TextInput
            type="date"
            value={caseData.next_mention_date || ""}
            disabled={savingField}
            onChange={(e) => handleFieldUpdate("next_mention_date", e.target.value)}
          />
        </FormField>
        <FormField label="Next hearing date">
          <TextInput
            type="date"
            value={caseData.next_hearing_date || ""}
            disabled={savingField}
            onChange={(e) => handleFieldUpdate("next_hearing_date", e.target.value)}
          />
        </FormField>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--color-slate)]">Record verification status:</span>
        <button
          type="button"
          onClick={() => handleFieldUpdate("verified", !caseData.verified)}
          disabled={savingField}
          className={`rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors ${
            caseData.verified
              ? "bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]"
              : "bg-[var(--color-slate-light)] text-[var(--color-ink)]"
          }`}
        >
          {caseData.verified ? "Mark unverified" : "Mark verified"}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--color-slate)]">
        Changes here notify all premium subscribers tracking this case automatically.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <AddEventForm caseId={id} onAdded={load} />
        <UploadDocumentForm caseId={id} onUploaded={load} />
      </div>

      {/* Event history */}
      <div className="mt-10">
        <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">Event history</h2>
        <ol className="mt-4 space-y-4 border-l-2 border-[var(--color-brass)]/40 pl-6">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.78rem] top-1 h-3 w-3 rounded-full bg-[var(--color-brass)]" />
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">{e.event_date} · {e.event_type}</p>
              {e.notes && <p className="mt-1 text-sm text-[var(--color-ink)]">{e.notes}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function AddEventForm({ caseId, onAdded }) {
  const [form, setForm] = useState({ event_date: "", event_type: "MENTION", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await casesApi.adminAddEvent(caseId, form);
      setForm({ event_date: "", event_type: "MENTION", notes: "" });
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || "Could not log event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5">
      <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">Log an event</h3>
      {error && <p className="mt-2 text-xs text-[var(--color-brick)]">{error}</p>}
      <div className="mt-4 space-y-3">
        <FormField label="Event date">
          <TextInput type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        </FormField>
        <FormField label="Event type">
          <SelectInput value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="Notes">
          <TextArea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FormField>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Logging…" : "Log event"}</Button>
      </div>
    </form>
  );
}

function UploadDocumentForm({ caseId, onUploaded }) {
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState("PUBLIC");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) { setError("Please choose a file."); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("access_level", accessLevel);
      formData.append("file", file);
      await casesApi.adminUploadDocument(caseId, formData);
      setTitle(""); setFile(null);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. File must be a PDF under 10MB.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5">
      <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">Upload a document</h3>
      {error && <p className="mt-2 text-xs text-[var(--color-brick)]">{error}</p>}
      <div className="mt-4 space-y-3">
        <FormField label="Document title">
          <TextInput required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ruling — 14 Jul 2026" />
        </FormField>
        <FormField label="Access level">
          <SelectInput value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="PUBLIC">Public</option>
            <option value="PREMIUM">Premium only</option>
          </SelectInput>
        </FormField>
        <FormField label="File (PDF, max 10MB)">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-[var(--color-slate)] file:mr-4 file:rounded-sm file:border-0 file:bg-[var(--color-ink)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </FormField>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Uploading…" : "Upload document"}</Button>
      </div>
    </form>
  );
}
