import { useMemo } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { KpiCard, KpiStrip } from "@/components/ui/KpiCard";
import { SectionHeader, Panel } from "@/components/ui/Primitives";
import { LoadingState, ErrorState } from "@/components/ui/DataStates";
import { useAsyncData } from "@/utils/useAsyncData";
import { getWeatherArrival, getDashboardMetrics, getMandiSummary } from "@/data/loaders/datasets";
import { aggregateByDate } from "@/data/adapters/weatherAdapter";
import { useGlobalFilters } from "@/components/layout/FilterContext";
import { applyFilters } from "@/utils/filterUtils";
import { RainfallArrivalChart } from "@/charts/RainfallArrivalChart";
import { formatNumber, formatOneDecimal, formatDate } from "@/utils/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { chartColors, axisTickStyle } from "@/charts/theme";

export default function Weather() {
  const weatherState = useAsyncData(getWeatherArrival, []);
  const metricsState = useAsyncData(getDashboardMetrics, []);
  const mandiState = useAsyncData(getMandiSummary, []);
  const { filters } = useGlobalFilters();

  const filteredData = useMemo(() => {
    if (weatherState.status !== "ready") return [];
    const mandiSummary = mandiState.status === "ready" ? mandiState.data : [];
    return applyFilters(weatherState.data, filters, mandiSummary);
  }, [weatherState, mandiState, filters]);

  const daily = useMemo(
    () => (weatherState.status === "ready" ? aggregateByDate(filteredData) : []),
    [weatherState, filteredData]
  );

  const loading = weatherState.status === "loading" || weatherState.status === "idle";

  return (
    <div>
      <PageHeader title="Weather" subtitle="Rainfall, temperature and their association with mandi arrivals." />

      {loading && <LoadingState label="Loading weather and arrival records" />}
      {weatherState.status === "error" && <ErrorState message={weatherState.message} />}

      {weatherState.status === "ready" && (
        <div className="space-y-6">
          {metricsState.status === "ready" && (
            <KpiStrip>
              <KpiCard
                label="Rainfall–arrival correlation"
                value={metricsState.data.summary.rainfall_arrival_correlation.toFixed(4)}
                detail="Association, not causation"
              />
              <KpiCard label="Mandi-day pairs" value={formatNumber(metricsState.data.summary.weather_valid_pairs)} />
              <KpiCard
                label="Date coverage"
                value={`${metricsState.data.summary.weather_date_coverage.weather_dates_count} / ${metricsState.data.summary.weather_date_coverage.arrival_dates_count}`}
                detail="Weather dates vs. arrival dates"
              />
            </KpiStrip>
          )}

          <Panel>
            <SectionHeader
              title="Daily rainfall vs. total arrivals"
              detail="Aggregated across all mandis per day — a correlation coefficient describes linear association only, not cause and effect"
            />
            <RainfallArrivalChart data={daily} />
          </Panel>

          <Panel>
            <SectionHeader title="Average temperature by day" />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={axisTickStyle}
                  axisLine={{ stroke: chartColors.line }}
                  tickLine={false}
                  tickFormatter={formatDate}
                  minTickGap={40}
                />
                <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={40} unit="°C" />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: number) => [`${formatOneDecimal(value)}°C`, "Avg temperature"]}
                  contentStyle={{ borderRadius: 6, borderColor: chartColors.line, fontSize: 13 }}
                />
                <Line type="monotone" dataKey="avg_temperature_c" stroke={chartColors.rust} strokeWidth={1.75} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {metricsState.status === "ready" &&
            metricsState.data.summary.weather_date_coverage.weather_dates_count <
              metricsState.data.summary.weather_date_coverage.arrival_dates_count && (
              <p className="text-xs text-ink-faint">
                Weather records cover {metricsState.data.summary.weather_date_coverage.weather_dates_count} of{" "}
                {metricsState.data.summary.weather_date_coverage.arrival_dates_count} arrival dates — a handful of days
                have arrival data without a matching weather reading.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
