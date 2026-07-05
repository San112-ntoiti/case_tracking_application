import { useState, useEffect } from "react";
import { casesApi } from "../../api/endpoints";
import FormField, { TextInput, SelectInput, TextArea } from "../FormField";
import Button from "../Button";

const STATUS_OPTIONS = ["FILED", "MENTION", "HEARING", "RULING", "CLOSED", "STAYED"];
const PARTY_ROLES = ["PLAINTIFF", "DEFENDANT", "ACCUSED", "APPLICANT", "RESPONDENT", "PETITIONER", "INTERESTED_PARTY"];

export default function CreateCaseModal({ onClose, onCreated }) {
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState({
    case_number: "", case_type: "", court: "", judge_name: "",
    status: "FILED", next_mention_date: "", next_hearing_date: "", public_summary: "",
  });
  const [parties, setParties] = useState([{ party_name: "", party_role: "PLAINTIFF" }]);
  const [advocates, setAdvocates] = useState([{ advocate_name: "", law_firm: "" }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    casesApi.getCourts().then(({ data }) => setCourts(data));
  }, []);

  const updateParty = (i, field, value) => {
    setParties((p) => p.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };
  const updateAdvocate = (i, field, value) => {
    setAdvocates((a) => a.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await casesApi.adminCreate({
        ...form,
        next_mention_date: form.next_mention_date || null,
        next_hearing_date: form.next_hearing_date || null,
        parties: parties.filter((p) => p.party_name),
        advocates: advocates.filter((a) => a.advocate_name),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create case. Check the fields and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-2xl rounded-sm bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
            Create new case
          </h2>
          <button onClick={onClose} className="text-[var(--color-slate)] hover:text-[var(--color-ink)]">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="rounded-sm bg-[var(--color-brick-bg)] px-4 py-3 text-sm text-[var(--color-brick)]">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Case number">
              <TextInput required value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="HCCC E001/2025" />
            </FormField>
            <FormField label="Case type">
              <TextInput required value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })} placeholder="Civil" />
            </FormField>
            <FormField label="Court">
              <SelectInput required value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })}>
                <option value="">Select court…</option>
                {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Judge / Magistrate">
              <TextInput value={form.judge_name} onChange={(e) => setForm({ ...form, judge_name: e.target.value })} />
            </FormField>
            <FormField label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Next mention date">
              <TextInput type="date" value={form.next_mention_date} onChange={(e) => setForm({ ...form, next_mention_date: e.target.value })} />
            </FormField>
            <FormField label="Next hearing date">
              <TextInput type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} />
            </FormField>
          </div>

          <FormField label="Public summary">
            <TextArea rows={3} value={form.public_summary} onChange={(e) => setForm({ ...form, public_summary: e.target.value })} />
          </FormField>

          <div>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Parties</h3>
            {parties.map((p, i) => (
              <div key={i} className="mt-2 grid grid-cols-[1fr_140px] gap-2">
                <TextInput placeholder="Party name" value={p.party_name} onChange={(e) => updateParty(i, "party_name", e.target.value)} />
                <SelectInput value={p.party_role} onChange={(e) => updateParty(i, "party_role", e.target.value)}>
                  {PARTY_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </SelectInput>
              </div>
            ))}
            <button type="button" onClick={() => setParties([...parties, { party_name: "", party_role: "PLAINTIFF" }])}
              className="mt-2 text-xs font-semibold text-[var(--color-ink)] underline">+ Add party</button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Advocates</h3>
            {advocates.map((a, i) => (
              <div key={i} className="mt-2 grid grid-cols-2 gap-2">
                <TextInput placeholder="Advocate name" value={a.advocate_name} onChange={(e) => updateAdvocate(i, "advocate_name", e.target.value)} />
                <TextInput placeholder="Law firm" value={a.law_firm} onChange={(e) => updateAdvocate(i, "law_firm", e.target.value)} />
              </div>
            ))}
            <button type="button" onClick={() => setAdvocates([...advocates, { advocate_name: "", law_firm: "" }])}
              className="mt-2 text-xs font-semibold text-[var(--color-ink)] underline">+ Add advocate</button>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--color-slate-light)]/30 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create case"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
