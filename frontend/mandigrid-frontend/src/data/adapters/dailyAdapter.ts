import type { DailyMandiRow } from "@/types/analytics";

export interface DailyArrivalPoint {
  date: string;
  total_arrival_qtl: number;
}

/** Total arrivals per day for one crop, summed across all mandis, date-sorted. */
export function dailyArrivalsForCrop(rows: DailyMandiRow[], cropName: string): DailyArrivalPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (row.crop_name !== cropName) continue;
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total_arrival_qtl);
  }
  return Array.from(byDate.entries())
    .map(([date, total_arrival_qtl]) => ({ date, total_arrival_qtl }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function uniqueCropsFromDaily(rows: DailyMandiRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.crop_name))).sort();
}
