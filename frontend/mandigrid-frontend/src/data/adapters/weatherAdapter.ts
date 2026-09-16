import type { WeatherArrivalRow } from "@/types/analytics";

export interface DailyWeatherPoint {
  date: string;
  avg_rainfall_mm: number;
  avg_temperature_c: number;
  total_arrival_qtl: number;
}

/**
 * Rolls the mandi-day weather/arrival rows up to one point per date
 * (mean rainfall, mean temperature, summed arrivals across mandis).
 * This matches the granularity the governed correlation figure in
 * dashboard_metrics.json was computed at (~276 dates), and keeps the
 * chart to a few hundred points instead of the full 5,676-row table.
 */
export function aggregateByDate(rows: WeatherArrivalRow[]): DailyWeatherPoint[] {
  const byDate = new Map<
    string,
    { rainSum: number; tempSum: number; arrivalSum: number; count: number }
  >();

  for (const row of rows) {
    const entry = byDate.get(row.date) ?? { rainSum: 0, tempSum: 0, arrivalSum: 0, count: 0 };
    entry.rainSum += row.avg_rainfall_mm;
    entry.tempSum += row.avg_temperature_c;
    entry.arrivalSum += row.total_arrival_qtl;
    entry.count += 1;
    byDate.set(row.date, entry);
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      avg_rainfall_mm: v.rainSum / v.count,
      avg_temperature_c: v.tempSum / v.count,
      total_arrival_qtl: v.arrivalSum,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
