import type { MandiSummaryRow, DailyMandiRow } from "@/types/analytics";

export function searchMandis(rows: MandiSummaryRow[], query: string): MandiSummaryRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.mandi_name.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.mandi_id.toLowerCase().includes(q)
  );
}

export function sortMandis(
  rows: MandiSummaryRow[],
  key: "total_arrival_qtl" | "mandi_name" | "state",
  direction: "asc" | "desc" = "desc"
): MandiSummaryRow[] {
  return [...rows].sort((a, b) => {
    if (key === "mandi_name" || key === "state") {
      const cmp = a[key].localeCompare(b[key]);
      return direction === "asc" ? cmp : -cmp;
    }
    const cmp = a[key] - b[key];
    return direction === "asc" ? cmp : -cmp;
  });
}

/**
 * Number of distinct crops handled by each mandi, derived from the daily
 * arrivals file. Computed once (cached by the caller) rather than on every
 * keystroke or render.
 */
export function cropCoverageByMandi(dailyRows: DailyMandiRow[]): Map<string, number> {
  const cropsByMandi = new Map<string, Set<string>>();
  for (const row of dailyRows) {
    const set = cropsByMandi.get(row.mandi_id) ?? new Set<string>();
    set.add(row.crop_name);
    cropsByMandi.set(row.mandi_id, set);
  }
  const result = new Map<string, number>();
  for (const [mandiId, crops] of cropsByMandi.entries()) {
    result.set(mandiId, crops.size);
  }
  return result;
}
