import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { SectionHeader, Panel, DataTable, type Column } from "@/components/ui/Primitives";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/DataStates";
import { useAsyncData } from "@/utils/useAsyncData";
import { getPriceMsp, getMandiSummary } from "@/data/loaders/datasets";
import { aggregateByCrop, trendForCrop, type CropPriceAggregate } from "@/data/adapters/priceAdapter";
import { BelowMspByCropChart } from "@/charts/BelowMspByCropChart";
import { PriceMspTrendChart } from "@/charts/PriceMspTrendChart";
import { formatRupee, formatPercent, formatNumber } from "@/utils/format";
import { useGlobalFilters } from "@/components/layout/FilterContext";
import { applyFilters } from "@/utils/filterUtils";

const columns: Column<CropPriceAggregate>[] = [
  { key: "crop_name", header: "Crop", render: (r) => r.crop_name },
  { key: "modal", header: "Avg modal price", align: "right", render: (r) => formatRupee(r.weighted_avg_modal_price) },
  { key: "msp", header: "Avg MSP", align: "right", render: (r) => formatRupee(r.weighted_avg_msp) },
  {
    key: "gap",
    header: "Price gap",
    align: "right",
    render: (r) => (
      <span className={r.price_gap < 0 ? "text-grain-rust" : "text-grain-greenDark"}>
        {r.price_gap >= 0 ? "+" : ""}
        {formatRupee(r.price_gap)}
      </span>
    ),
  },
  { key: "below", header: "Below MSP", align: "right", render: (r) => `${formatNumber(r.below_msp_count)} (${formatPercent(r.below_msp_rate_pct)})` },
  { key: "records", header: "Observations", align: "right", render: (r) => formatNumber(r.records_count) },
];

export default function PricesMsp() {
  const priceState = useAsyncData(getPriceMsp, []);
  const mandiState = useAsyncData(getMandiSummary, []);
  const { filters } = useGlobalFilters();

  const filteredData = useMemo(() => {
    if (priceState.status !== "ready") return [];
    const mandiSummary = mandiState.status === "ready" ? mandiState.data : [];
    return applyFilters(priceState.data, filters, mandiSummary);
  }, [priceState, mandiState, filters]);

  const cropAggregates = useMemo(() => aggregateByCrop(filteredData), [filteredData]);

  // If crop is filtered globally, we don't need a local crop selector, we just use the first available.
  const activeCrop = cropAggregates[0]?.crop_name ?? null;

  const trend = useMemo(() => {
    if (!activeCrop || filteredData.length === 0) return [];
    return trendForCrop(filteredData, activeCrop);
  }, [filteredData, activeCrop]);

  return (
    <div>
      <PageHeader
        title="Prices & MSP"
        subtitle="Modal prices against the Minimum Support Price, by crop, from daily mandi observations."
      />

      {(priceState.status === "loading" || priceState.status === "idle") && (
        <LoadingState label="Loading price and MSP records" />
      )}
      {priceState.status === "error" && <ErrorState message={priceState.message} />}

      {priceState.status === "ready" && cropAggregates.length === 0 && (
        <EmptyState detail="No valid price/MSP observations were found in the analytics file." />
      )}

      {priceState.status === "ready" && cropAggregates.length > 0 && (
        <div className="space-y-6">
          <Panel>
            <SectionHeader
              title="Below-MSP rate by crop"
              detail="Share of observations where the modal price fell below the crop's MSP"
            />
            <BelowMspByCropChart data={cropAggregates} />
          </Panel>

          <Panel>
            <SectionHeader
              title="Modal price vs. MSP over time"
              detail={filters.crop !== "All" ? `Trend for ${activeCrop}` : `Trend for ${activeCrop} (highest volume crop in selection)`}
            />
            {trend.length > 0 ? (
              <PriceMspTrendChart data={trend} />
            ) : (
              <EmptyState detail="No trend data available for this crop." />
            )}
          </Panel>

          <Panel>
            <SectionHeader title="Crop-level comparison" detail="Weighted by number of underlying price observations" />
            <DataTable columns={columns} rows={cropAggregates} getRowKey={(r) => r.crop_name} />
          </Panel>
        </div>
      )}
    </div>
  );
}
