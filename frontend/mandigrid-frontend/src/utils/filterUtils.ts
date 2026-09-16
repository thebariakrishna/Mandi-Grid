import { FilterState } from "@/components/layout/FilterContext";
import { MandiSummaryRow } from "@/types/analytics";

// Helper to check if a row falls within a given time window (relative to max date in dataset: 2026-12-08)
export function isWithinWindow(dateStr: string, windowOption: string): boolean {
  if (windowOption === "All") return true;
  if (!dateStr) return true;
  
  const MAX_DATE = new Date("2026-12-08T00:00:00Z").getTime();
  const rowDate = new Date(dateStr).getTime();
  const diffDays = (MAX_DATE - rowDate) / (1000 * 60 * 60 * 24);
  
  if (windowOption === "30d") return diffDays <= 30 && diffDays >= 0;
  if (windowOption === "90d") return diffDays <= 90 && diffDays >= 0;
  return true;
}

export function applyFilters<T extends Record<string, any>>(
  rows: T[],
  filters: FilterState,
  mandiSummary: MandiSummaryRow[] = [] // Optional mapping if state filter is active but dataset lacks 'state'
): T[] {
  if (filters.crop === "All" && filters.state === "All" && filters.window === "All") {
    return rows;
  }

  // Create a fast lookup for mandi_id -> state if needed
  const mandiToState = new Map<string, string>();
  if (filters.state !== "All" && mandiSummary.length > 0) {
    for (const m of mandiSummary) {
      mandiToState.set(m.mandi_id, m.state);
    }
  }

  return rows.filter((row) => {
    // 1. Crop Filter
    if (filters.crop !== "All") {
      if ("crop_name" in row && row.crop_name !== filters.crop) return false;
    }

    // 2. State Filter
    if (filters.state !== "All") {
      if ("state" in row) {
        if (row.state !== filters.state) return false;
      } else if ("mandi_id" in row && mandiToState.size > 0) {
        // Resolve state via mandi mapping
        const rowState = mandiToState.get(row.mandi_id);
        if (rowState !== filters.state) return false;
      } else if (!("destination_warehouse" in row)) {
        // If it doesn't have state, mandi_id, and isn't transport, we shouldn't force a filter.
        // Actually for transport, there's no state/mandi_id easily available. We ignore state filter.
      }
    }

    // 3. Time Window Filter
    if (filters.window !== "All") {
      const dateStr = row.date || row.departure_time; // common date fields
      if (dateStr && !isWithinWindow(dateStr, filters.window)) {
        return false;
      }
    }

    return true;
  });
}
