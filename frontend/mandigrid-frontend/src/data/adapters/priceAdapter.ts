import type { PriceMspRow } from "@/types/analytics";

export interface CropPriceAggregate {
  crop_name: string;
  weighted_avg_modal_price: number;
  weighted_avg_msp: number;
  price_gap: number;
  records_count: number;
  below_msp_count: number;
  below_msp_rate_pct: number;
}

/**
 * Rolls the date x mandi x crop rows up to one row per crop.
 * Weighted by records_count so mandi/day combinations with more underlying
 * observations count proportionally more — this is a derived aggregation of
 * the provided rows, not a new measurement.
 */
export function aggregateByCrop(rows: PriceMspRow[]): CropPriceAggregate[] {
  const byCrop = new Map<
    string,
    { modalSum: number; mspSum: number; records: number; belowMsp: number }
  >();

  for (const row of rows) {
    const entry = byCrop.get(row.crop_name) ?? {
      modalSum: 0,
      mspSum: 0,
      records: 0,
      belowMsp: 0,
    };
    entry.modalSum += row.avg_modal_price * row.records_count;
    entry.mspSum += row.avg_msp * row.records_count;
    entry.records += row.records_count;
    entry.belowMsp += row.below_msp_count;
    byCrop.set(row.crop_name, entry);
  }

  return Array.from(byCrop.entries())
    .map(([crop_name, v]) => {
      const weighted_avg_modal_price = v.records ? v.modalSum / v.records : 0;
      const weighted_avg_msp = v.records ? v.mspSum / v.records : 0;
      return {
        crop_name,
        weighted_avg_modal_price,
        weighted_avg_msp,
        price_gap: weighted_avg_msp - weighted_avg_modal_price,
        records_count: v.records,
        below_msp_count: v.belowMsp,
        below_msp_rate_pct: v.records ? (v.belowMsp / v.records) * 100 : 0,
      };
    })
    .sort((a, b) => b.records_count - a.records_count);
}

export interface PriceTrendPoint {
  date: string;
  weighted_avg_modal_price: number;
  weighted_avg_msp: number;
}

/** Daily weighted-average modal price vs. MSP for a single crop, date-sorted. */
export function trendForCrop(rows: PriceMspRow[], cropName: string): PriceTrendPoint[] {
  const byDate = new Map<string, { modalSum: number; mspSum: number; records: number }>();

  for (const row of rows) {
    if (row.crop_name !== cropName) continue;
    const entry = byDate.get(row.date) ?? { modalSum: 0, mspSum: 0, records: 0 };
    entry.modalSum += row.avg_modal_price * row.records_count;
    entry.mspSum += row.avg_msp * row.records_count;
    entry.records += row.records_count;
    byDate.set(row.date, entry);
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      weighted_avg_modal_price: v.records ? v.modalSum / v.records : 0,
      weighted_avg_msp: v.records ? v.mspSum / v.records : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function uniqueCrops(rows: PriceMspRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.crop_name))).sort();
}
