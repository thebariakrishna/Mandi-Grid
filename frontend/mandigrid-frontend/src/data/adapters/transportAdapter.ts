import type { TransportSummaryRow } from "@/types/analytics";

export function sortByTransitHours(rows: TransportSummaryRow[], direction: "asc" | "desc" = "desc") {
  return [...rows].sort((a, b) =>
    direction === "desc"
      ? b.avg_transit_hours - a.avg_transit_hours
      : a.avg_transit_hours - b.avg_transit_hours
  );
}

export function sortByDelayRate(rows: TransportSummaryRow[], direction: "asc" | "desc" = "desc") {
  return [...rows].sort((a, b) =>
    direction === "desc"
      ? b.transit_delay_rate_percent - a.transit_delay_rate_percent
      : a.transit_delay_rate_percent - b.transit_delay_rate_percent
  );
}

export function totalTrips(rows: TransportSummaryRow[]): number {
  return rows.reduce((sum, r) => sum + r.total_trips, 0);
}
