import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { KpiCard, KpiStrip } from "@/components/ui/KpiCard";
import { SectionHeader, Panel, DataTable, type Column } from "@/components/ui/Primitives";
import { LoadingState, ErrorState } from "@/components/ui/DataStates";
import { useAsyncData } from "@/utils/useAsyncData";
import { getTransportSummary } from "@/data/loaders/datasets";
import { sortByTransitHours, totalTrips } from "@/data/adapters/transportAdapter";
import { WarehousePerformanceChart } from "@/charts/WarehousePerformanceChart";
import { formatNumber, formatHours, formatPercent } from "@/utils/format";
import type { TransportSummaryRow } from "@/types/analytics";

const columns: Column<TransportSummaryRow>[] = [
  { key: "wh", header: "Warehouse", render: (r) => r.destination_warehouse },
  { key: "trips", header: "Total trips", align: "right", render: (r) => formatNumber(r.total_trips) },
  { key: "hours", header: "Avg transit time", align: "right", render: (r) => formatHours(r.avg_transit_hours) },
  {
    key: "delay",
    header: "Delay rate",
    align: "right",
    render: (r) => (
      <span className={r.transit_delay_rate_percent >= 25 ? "text-grain-rust" : "text-ink"}>
        {formatPercent(r.transit_delay_rate_percent)}
      </span>
    ),
  },
];

export default function Logistics() {
  const state = useAsyncData(getTransportSummary, []);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = state.status === "ready" ? state.data : [];
  const sorted = useMemo(() => sortByTransitHours(rows, sortDir), [rows, sortDir]);

  const avgTransit = rows.length
    ? rows.reduce((s, r) => s + r.avg_transit_hours * r.total_trips, 0) / (totalTrips(rows) || 1)
    : 0;
  const avgDelay = rows.length
    ? rows.reduce((s, r) => s + r.transit_delay_rate_percent * r.total_trips, 0) / (totalTrips(rows) || 1)
    : 0;
  const slowest = sorted[0];

  return (
    <div>
      <PageHeader title="Logistics" subtitle="Warehouse-level transit performance from mandi to destination." />

      {(state.status === "loading" || state.status === "idle") && <LoadingState label="Loading transport summary" />}
      {state.status === "error" && <ErrorState message={state.message} />}

      {state.status === "ready" && (
        <div className="space-y-6">
          <KpiStrip>
            <KpiCard label="Total trips" value={formatNumber(totalTrips(rows))} detail={`${rows.length} destination warehouses`} />
            <KpiCard label="Trip-weighted avg transit" value={formatHours(avgTransit)} />
            <KpiCard label="Trip-weighted delay rate" value={formatPercent(avgDelay)} tone={avgDelay >= 20 ? "alert" : "default"} />
            {slowest && (
              <KpiCard label="Slowest warehouse" value={slowest.destination_warehouse} detail={formatHours(slowest.avg_transit_hours)} />
            )}
          </KpiStrip>

          <Panel>
            <SectionHeader title="Transit time vs. delay rate by warehouse" />
            <WarehousePerformanceChart data={rows} />
          </Panel>

          <Panel>
            <SectionHeader
              title="Warehouse comparison"
              action={
                <button
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-paper"
                >
                  Sort by transit time: {sortDir === "desc" ? "highest first" : "lowest first"}
                </button>
              }
            />
            <DataTable columns={columns} rows={sorted} getRowKey={(r) => r.destination_warehouse} />
          </Panel>
        </div>
      )}
    </div>
  );
}
