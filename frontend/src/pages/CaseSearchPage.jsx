import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { casesApi } from "../api/endpoints";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import { TextInput, SelectInput } from "../components/FormField";

const STATUS_OPTIONS = ["", "FILED", "MENTION", "HEARING", "RULING", "CLOSED", "STAYED"];

export default function CaseSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    case_number: searchParams.get("case_number") || "",
    party: searchParams.get("party") || "",
    advocate: searchParams.get("advocate") || "",
    court: searchParams.get("court") || "",
    judge: searchParams.get("judge") || "",
    status: searchParams.get("status") || "",
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const debounceRef = useRef(null);

  const runSearch = useCallback((activeFilters, activePage = 1) => {
    setLoading(true);
    const params = Object.fromEntries(
      Object.entries(activeFilters).filter(([, v]) => v)
    );
    params.page = activePage;
    casesApi
      .search(params)
      .then(({ data }) => setResults(data))
      .catch(() => setResults({ count: 0, results: [] }))
      .finally(() => setLoading(false));
  }, []);

  // Debounced auto-search on filter change (500ms per design spec)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      runSearch(filters, 1);
      setSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
    }, 500);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    runSearch(filters, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const hasAnyFilter = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
        Search court cases
      </h1>
      <p className="mt-1.5 text-[var(--color-slate)]">
        Search by case number, party name, advocate, or court — free and public.
      </p>

      {/* Filter panel */}
      <div className="mt-8 grid gap-4 rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <TextInput
          placeholder="Case number"
          value={filters.case_number}
          onChange={(e) => updateFilter("case_number", e.target.value)}
        />
        <TextInput
          placeholder="Party name"
          value={filters.party}
          onChange={(e) => updateFilter("party", e.target.value)}
        />
        <TextInput
          placeholder="Advocate name"
          value={filters.advocate}
          onChange={(e) => updateFilter("advocate", e.target.value)}
        />
        <TextInput
          placeholder="Court station"
          value={filters.court}
          onChange={(e) => updateFilter("court", e.target.value)}
        />
        <TextInput
          placeholder="Judge / Magistrate"
          value={filters.judge}
          onChange={(e) => updateFilter("judge", e.target.value)}
        />
        <SelectInput value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || "Any status"}</option>
          ))}
        </SelectInput>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading && (
          <div className="flex justify-center py-16 text-[var(--color-slate)]">
            <Spinner size={28} />
          </div>
        )}

        {!loading && results && results.count === 0 && (
          <EmptyState
            title="No cases found"
            description={
              hasAnyFilter
                ? "Try broadening your search — check spelling or remove a filter."
                : "Enter a case number, party name, or advocate to begin."
            }
          />
        )}

        {!loading && results && results.count > 0 && (
          <>
            <p className="mb-3 text-sm text-[var(--color-slate)]">
              {results.count} case{results.count !== 1 ? "s" : ""} found
            </p>
            <div className="overflow-hidden rounded-sm border border-[var(--color-slate-light)]/30 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-slate-light)]/30 bg-[var(--color-paper-dim)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Case Number</th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Court</th>
                    <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] sm:table-cell">Type</th>
                    <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                    <th className="hidden px-4 py-3 font-semibold text-[var(--color-ink)] md:table-cell">Next Hearing</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-slate-light)]/20">
                  {results.results.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--color-paper-dim)]/60">
                      <td className="case-number px-4 py-3.5 text-[var(--color-ink)]">{c.case_number}</td>
                      <td className="px-4 py-3.5 text-[var(--color-slate)]">{c.court_name}</td>
                      <td className="hidden px-4 py-3.5 text-[var(--color-slate)] sm:table-cell">{c.case_type}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="hidden px-4 py-3.5 text-[var(--color-slate)] md:table-cell">
                        {c.next_hearing_date || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/cases/${c.id}`}
                          className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-4"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {results.pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                <button
                  disabled={!results.previous}
                  onClick={() => setPage((p) => p - 1)}
                  className="font-medium text-[var(--color-ink)] disabled:opacity-30"
                >
                  ← Previous
                </button>
                <span className="text-[var(--color-slate)]">Page {page} of {results.pages}</span>
                <button
                  disabled={!results.next}
                  onClick={() => setPage((p) => p + 1)}
                  className="font-medium text-[var(--color-ink)] disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
