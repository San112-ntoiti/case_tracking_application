import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { casesApi } from "../api/endpoints";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import { TextInput } from "../components/FormField";
import CreateCaseModal from "../components/admin/CreateCaseModal";

export default function AdminCasesPage() {
  const [cases, setCases] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadCases = (params = {}) => {
    setLoading(true);
    casesApi.adminList(params).then(({ data }) => setCases(data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadCases(); }, []);

  useEffect(() => {
    const t = setTimeout(() => loadCases(search ? { case_number: search } : {}), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
            Manage cases
          </h1>
          <p className="mt-1 text-[var(--color-slate)]">Create, update, and log events for court cases.</p>
        </div>
        <Button variant="brass" onClick={() => setShowCreate(true)}>+ New case</Button>
      </div>

      <div className="mt-6 max-w-sm">
        <TextInput
          placeholder="Search by case number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Case Number</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Court</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                  <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] md:table-cell">Next Hearing</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-slate-light)]/20">
                {cases?.results?.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--color-paper-dim)]/60">
                    <td className="case-number px-4 py-3.5 text-[var(--color-ink)]">{c.case_number}</td>
                    <td className="px-4 py-3.5 text-[var(--color-slate)]">{c.court?.name}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="hidden px-4 py-3.5 text-[var(--color-slate)] md:table-cell">{c.next_hearing_date || "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link to={`/admin/cases/${c.id}`} className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCaseModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadCases(); }}
        />
      )}
    </div>
  );
}
