import { PageHeader } from "@/components/layout/AppShell";
import { KpiCard, KpiStrip } from "@/components/ui/KpiCard";
import { SectionHeader, Panel } from "@/components/ui/Primitives";
import { LoadingState, ErrorState } from "@/components/ui/DataStates";
import { useAsyncData } from "@/utils/useAsyncData";
import { getDashboardMetrics, getInsights, getWeatherArrival, getMandiSummary, getDailyMandi, getTransportSummary, getPriceMsp } from "@/data/loaders/datasets";
import { useGlobalFilters } from "@/components/layout/FilterContext";
import { applyFilters } from "@/utils/filterUtils";
import { useMemo } from "react";
import type { WeatherArrivalRow, InsightItem } from "@/types/analytics";
import { ArrivalsByCropChart } from "@/charts/ArrivalsByCropChart";
import { TopMandisChart } from "@/charts/TopMandisChart";
import { WarehousePerformanceChart } from "@/charts/WarehousePerformanceChart";
import { RainfallArrivalChart } from "@/charts/RainfallArrivalChart";
import { aggregateByDate } from "@/data/adapters/weatherAdapter";
import {
  formatQtl,
  formatNumber,
  formatPercent,
  formatHours,
  formatRupee,
} from "@/utils/format";

export default function Overview() {
  const metricsState = useAsyncData(getDashboardMetrics, []);
  const insightsState = useAsyncData(getInsights, []);
  const weatherState = useAsyncData(getWeatherArrival, []);
  
  const mandiState = useAsyncData(getMandiSummary, []);
  const dailyState = useAsyncData(getDailyMandi, []);
  const transportState = useAsyncData(getTransportSummary, []);
  const priceState = useAsyncData(getPriceMsp, []);
  
  const { filters } = useGlobalFilters();
  const isActive = filters.state !== "All" || filters.crop !== "All" || filters.window !== "All";

  const rawWeather = weatherState.status === "ready" ? weatherState.data : [];
  const rawMandi = mandiState.status === "ready" ? mandiState.data : [];
  const rawDaily = dailyState.status === "ready" ? dailyState.data : [];
  const rawTransport = transportState.status === "ready" ? transportState.data : [];
  const rawPrice = priceState.status === "ready" ? priceState.data : [];

  const weatherFiltered = useMemo(() => applyFilters(rawWeather, filters, rawMandi) as WeatherArrivalRow[], [rawWeather, filters, rawMandi]);
  const weatherDaily = useMemo(() => aggregateByDate(weatherFiltered), [weatherFiltered]);
  
  const topMandisData = useMemo(() => {
    if (metricsState.status !== "ready") return [];
    if (!isActive) return metricsState.data.top_5_mandis;
    const filtered = applyFilters(rawMandi, filters);
    return [...filtered].sort((a, b) => b.total_arrival_qtl - a.total_arrival_qtl).slice(0, 5);
  }, [isActive, metricsState, rawMandi, filters]);

  const cropDistributionData = useMemo(() => {
    if (metricsState.status !== "ready") return [];
    if (!isActive) return metricsState.data.crop_distribution;
    const filtered = applyFilters(rawDaily, filters, rawMandi);
    const map = new Map<string, number>();
    let total = 0;
    for (const r of filtered) {
      map.set(r.crop_name, (map.get(r.crop_name) ?? 0) + r.total_arrival_qtl);
      total += r.total_arrival_qtl;
    }
    return Array.from(map.entries()).map(([crop_name, total_arrival_qtl]) => ({
      crop_name,
      total_arrival_qtl,
      arrival_share_percent: total > 0 ? (total_arrival_qtl / total) * 100 : 0
    })).sort((a, b) => b.total_arrival_qtl - a.total_arrival_qtl);
  }, [isActive, metricsState, rawDaily, filters, rawMandi]);

  const logisticsData = useMemo(() => {
    if (metricsState.status !== "ready") return [];
    if (!isActive) return metricsState.data.warehouse_logistics;
    return applyFilters(rawTransport, filters);
  }, [isActive, metricsState, rawTransport, filters]);

  const totalArrivals = useMemo(() => {
    if (metricsState.status !== "ready") return 0;
    if (!isActive) return metricsState.data.summary.total_arrivals_qtl;
    return cropDistributionData.reduce((s, c) => s + c.total_arrival_qtl, 0);
  }, [isActive, metricsState, cropDistributionData]);

  const totalMandis = useMemo(() => {
    if (metricsState.status !== "ready") return 0;
    if (!isActive) return metricsState.data.summary.total_mandis;
    const filteredMandi = applyFilters(rawMandi, filters);
    return new Set(filteredMandi.map(r => r.mandi_id)).size;
  }, [isActive, metricsState, rawMandi, filters]);

  const totalCrops = useMemo(() => {
    if (metricsState.status !== "ready") return 0;
    if (!isActive) return metricsState.data.summary.total_crops;
    return cropDistributionData.length;
  }, [isActive, metricsState, cropDistributionData]);

  const priceMetrics = useMemo(() => {
    if (metricsState.status !== "ready") return null;
    if (!isActive) return metricsState.data.summary;
    const filteredPrice = applyFilters(rawPrice, filters, rawMandi);
    if (filteredPrice.length === 0) return null;

    let belowCount = 0;
    let recordsCount = 0;
    let modalSum = 0;
    let mspSum = 0;

    for (const r of filteredPrice) {
      belowCount += r.below_msp_count;
      recordsCount += r.records_count;
      modalSum += r.avg_modal_price * r.records_count;
      mspSum += r.avg_msp * r.records_count;
    }

    if (recordsCount === 0) return null;
    const modal = modalSum / recordsCount;
    const msp = mspSum / recordsCount;

    return {
      below_msp_rate_pct: (belowCount / recordsCount) * 100,
      below_msp_count: belowCount,
      valid_price_msp_observations: recordsCount,
      governed_avg_price_gap_rs_qtl: msp - modal,
      governed_avg_modal_price_rs_qtl: modal,
      governed_avg_msp_rs_qtl: msp,
    };
  }, [isActive, metricsState, rawPrice, filters, rawMandi]);

  const transportMetrics = useMemo(() => {
    if (metricsState.status !== "ready") return null;
    if (!isActive) return metricsState.data.summary;
    if (logisticsData.length === 0) return null;

    let totalHours = 0;
    let totalDelays = 0;
    let totalTrips = 0;

    for (const r of logisticsData) {
      totalHours += r.avg_transit_hours * r.total_trips;
      totalDelays += r.transit_delay_rate_percent * r.total_trips;
      totalTrips += r.total_trips;
    }

    if (totalTrips === 0) return null;

    return {
      avg_transit_hours_overall: totalHours / totalTrips,
      transit_delay_rate_pct: totalDelays / totalTrips,
    };
  }, [isActive, metricsState, logisticsData]);

  if (metricsState.status === "loading" || metricsState.status === "idle") {
    return (
      <div>
        <PageHeader title="Network Overview" subtitle="Executive summary of the MandiGrid supply chain." />
        <LoadingState label="Loading dashboard metrics" />
      </div>
    );
  }

  if (metricsState.status === "error") {
    return (
      <div>
        <PageHeader title="Network Overview" subtitle="Executive summary of the MandiGrid supply chain." />
        <ErrorState message={metricsState.message} />
      </div>
    );
  }

  const m = metricsState.data.summary;

  return (
    <div className="space-y-8">
      <PageHeader title={isActive ? "Filtered Overview" : "Network Overview"} subtitle={isActive ? "Filtered supply chain execution." : "Executive summary of the MandiGrid supply chain. (Global Unfiltered Baseline)"} />

      <KpiStrip>
        <KpiCard label="Total arrivals" value={formatQtl(totalArrivals)} detail={`${totalMandis} mandis · ${totalCrops} crops`} />
        {priceMetrics ? (
          <>
            <KpiCard
              label="Below MSP"
              value={formatPercent(priceMetrics.below_msp_rate_pct)}
              detail={`${formatNumber(priceMetrics.below_msp_count)} of ${formatNumber(priceMetrics.valid_price_msp_observations)} observations`}
              tone={priceMetrics.below_msp_rate_pct >= 30 ? "alert" : "default"}
            />
            <KpiCard
              label="Avg price gap (MSP - Modal)"
              value={formatRupee(priceMetrics.governed_avg_price_gap_rs_qtl)}
              detail={`modal ${formatRupee(priceMetrics.governed_avg_modal_price_rs_qtl)} vs MSP ${formatRupee(priceMetrics.governed_avg_msp_rs_qtl)}`}
              tone={priceMetrics.governed_avg_price_gap_rs_qtl > 0 ? "alert" : "positive"}
            />
          </>
        ) : (
          <>
            <KpiCard label="Below MSP" value="N/A" detail="No data" />
            <KpiCard label="Avg price gap" value="N/A" detail="No data" />
          </>
        )}

        {transportMetrics ? (
          <>
            <KpiCard
              label="Avg transit time"
              value={formatHours(transportMetrics.avg_transit_hours_overall)}
            />
            <KpiCard
              label="Transit delay rate"
              value={formatPercent(transportMetrics.transit_delay_rate_pct)}
              tone={transportMetrics.transit_delay_rate_pct >= 20 ? "alert" : "default"}
            />
          </>
        ) : (
          <>
            <KpiCard label="Avg transit time" value="N/A" detail="No transport data for this selection" />
            <KpiCard label="Transit delay rate" value="N/A" />
          </>
        )}
      </KpiStrip>

      {insightsState.status === "ready" && insightsState.data.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Network Signals" detail="Key findings automatically derived from the analytics engine" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insightsState.data.map((insight: InsightItem) => (
              <Panel key={insight.category} className="border-l-4 border-l-grain-greenDark">
                <p className="text-xs font-bold uppercase tracking-wider text-grain-greenDark">{insight.category}</p>
                <p className="mt-2 text-sm text-ink">{insight.statement}</p>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* ARRIVALS & MARKET RISK */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink border-b border-line pb-2">1. Supply Concentration</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <SectionHeader
              title="Arrivals by Crop"
              detail={`Total volume in selection: ${formatQtl(totalArrivals)}`}
            />
            <ArrivalsByCropChart data={cropDistributionData} />
          </Panel>

          <Panel>
            <SectionHeader title="Top 5 Supply Nodes" detail="Highest-arrival mandis in the network" />
            <TopMandisChart data={topMandisData} />
          </Panel>
        </div>
      </div>

      {/* LOGISTICS */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink border-b border-line pb-2">2. Logistics Bottlenecks</h2>
        <Panel>
          <SectionHeader
            title="Warehouse Transit Performance"
            detail="Average transit time (bars) against delay rate (line) per destination warehouse"
          />
          <WarehousePerformanceChart data={logisticsData} />
        </Panel>
      </div>

      {/* EXTERNAL CONDITIONS */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink border-b border-line pb-2">3. External Conditions</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-1 flex flex-col justify-center">
            <h3 className="font-medium text-ink mb-2">Rainfall–Arrival Relationship</h3>
            <p className="text-sm text-ink mb-4">
              Daily rainfall and daily arrivals show a correlation coefficient of{" "}
              <span className="font-mono font-bold text-grain-rust">{m.rainfall_arrival_correlation.toFixed(4)}</span>
            </p>
            <p className="text-xs text-ink-soft bg-paper p-3 rounded border border-line">
              {m.correlation_interpretation}
            </p>
          </Panel>
          <Panel className="lg:col-span-2">
            {weatherDaily.length > 0 ? (
              <RainfallArrivalChart data={weatherDaily} />
            ) : (
              <LoadingState label="Loading weather visualization..." />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
