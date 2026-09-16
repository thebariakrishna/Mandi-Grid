import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { KpiCard, KpiStrip } from "@/components/ui/KpiCard";
import { SectionHeader, Panel, DataTable, SearchInput, type Column } from "@/components/ui/Primitives";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/DataStates";
import { useAsyncData } from "@/utils/useAsyncData";
import { getMandiSummary, getDailyMandi } from "@/data/loaders/datasets";
import { searchMandis, sortMandis, cropCoverageByMandi } from "@/data/adapters/mandiAdapter";
import { formatQtl, formatPercent, formatNumber } from "@/utils/format";
import { useGlobalFilters } from "@/components/layout/FilterContext";
import { applyFilters } from "@/utils/filterUtils";
import type { MandiSummaryRow } from "@/types/analytics";

export default function Mandis() {
  const mandiState = useAsyncData(getMandiSummary, []);
  // Crop coverage is a nice-to-have derived column; load the daily file lazily
  // and independently so a slow/failed load never blocks the core mandi table.
  const dailyState = useAsyncData(getDailyMandi, []);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"total_arrival_qtl" | "mandi_name" | "state">("total_arrival_qtl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const coverage = useMemo(
    () => (dailyState.status === "ready" ? cropCoverageByMandi(dailyState.data) : null),
    [dailyState]
  );

  const { filters } = useGlobalFilters();

  const rows = useMemo(() => {
    if (mandiState.status !== "ready") return [];
    return applyFilters(mandiState.data, filters);
  }, [mandiState, filters]);

  const filtered = useMemo(() => searchMandis(rows, query), [rows, query]);
  const sorted = useMemo(() => sortMandis(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  const columns: Column<MandiSummaryRow>[] = [
    { key: "name", header: "Mandi", render: (r) => <span className="font-medium">{r.mandi_name}</span> },
    { key: "state", header: "State", render: (r) => r.state },
    { key: "district", header: "District", render: (r) => r.district },
    { key: "arrivals", header: "Total arrivals", align: "right", render: (r) => formatQtl(r.total_arrival_qtl) },
    { key: "share", header: "Share of total", align: "right", render: (r) => formatPercent(r.arrival_share_percent) },
    {
      key: "crops",
      header: "Crops handled",
      align: "right",
      render: (r) => (coverage ? formatNumber(coverage.get(r.mandi_id) ?? 0) : "—"),
    },
  ];

  return (
    <div>
      <PageHeader title="Mandis" subtitle="Search and compare mandi-level arrival performance." />

      {(mandiState.status === "loading" || mandiState.status === "idle") && <LoadingState label="Loading mandi summary" />}
      {mandiState.status === "error" && <ErrorState message={mandiState.message} />}

      {mandiState.status === "ready" && (
        <div className="space-y-6">
          <KpiStrip>
            <KpiCard label="Mandis tracked" value={formatNumber(rows.length)} />
            <KpiCard
              label="Top mandi"
              value={sortMandis(rows, "total_arrival_qtl", "desc")[0]?.mandi_name ?? "—"}
              detail={formatQtl(sortMandis(rows, "total_arrival_qtl", "desc")[0]?.total_arrival_qtl ?? 0)}
            />
            <KpiCard label="States represented" value={formatNumber(new Set(rows.map((r) => r.state)).size)} />
          </KpiStrip>

          <Panel>
            <SectionHeader
              title="Mandi directory"
              detail={`${sorted.length} of ${rows.length} mandis`}
              action={<SearchInput value={query} onChange={setQuery} placeholder="Search by mandi, state or district" />}
            />
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-ink-soft">
              Sort by:
              {(["total_arrival_qtl", "mandi_name", "state"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (sortKey === key) {
                      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                    } else {
                      setSortKey(key);
                      setSortDir("desc");
                    }
                  }}
                  className={`rounded-full px-2.5 py-0.5 ${
                    sortKey === key ? "bg-grain-green/10 font-medium text-grain-greenDark" : "border border-line"
                  }`}
                >
                  {key === "total_arrival_qtl" ? "Arrivals" : key === "mandi_name" ? "Name" : "State"}
                  {sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                </button>
              ))}
            </div>
            {sorted.length === 0 ? (
              <EmptyState title="No mandis match your search" detail="Try a different mandi name, state, or district." />
            ) : (
              <DataTable columns={columns} rows={sorted} getRowKey={(r) => r.mandi_id} />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
