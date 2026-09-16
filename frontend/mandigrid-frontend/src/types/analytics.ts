/**
 * Types mirror the actual columns present in the frozen analytics files.
 * Nothing here is invented — every field maps 1:1 to a CSV column or JSON key.
 */

export interface CropSummaryRow {
  crop_name: string;
  total_arrival_qtl: number;
  arrival_share_percent: number;
}

export interface PriceMspRow {
  date: string;
  mandi_id: string;
  crop_name: string;
  avg_modal_price: number;
  avg_msp: number;
  records_count: number;
  below_msp_count: number;
}

export interface TransportSummaryRow {
  destination_warehouse: string;
  total_trips: number;
  avg_transit_hours: number;
  transit_delay_rate_percent: number;
}

export interface DailyMandiRow {
  date: string;
  mandi_id: string;
  crop_name: string;
  total_arrival_qtl: number;
}

export interface MandiSummaryRow {
  mandi_id: string;
  total_arrival_qtl: number;
  mandi_name: string;
  state: string;
  district: string;
  arrival_share_percent: number;
}

export interface WeatherArrivalRow {
  date: string;
  mandi_id: string;
  avg_rainfall_mm: number;
  avg_temperature_c: number;
  total_arrival_qtl: number;
}

export interface TopMandi {
  mandi_id: string;
  total_arrival_qtl: number;
  mandi_name: string;
  state: string;
  district: string;
  arrival_share_percent: number;
}

export interface CropDistributionItem {
  crop_name: string;
  total_arrival_qtl: number;
  arrival_share_percent: number;
}

export interface WarehouseLogisticsItem {
  destination_warehouse: string;
  total_trips: number;
  avg_transit_hours: number;
  transit_delay_rate_percent: number;
}

export interface DashboardMetrics {
  summary: {
    total_arrivals_qtl: number;
    total_mandis: number;
    total_crops: number;
    total_price_records_checked: number;
    valid_price_msp_observations: number;
    below_msp_count: number;
    below_msp_rate_pct: number;
    governed_avg_modal_price_rs_qtl: number;
    governed_avg_msp_rs_qtl: number;
    governed_avg_price_gap_rs_qtl: number;
    avg_transit_hours_overall: number;
    median_transit_hours_overall: number;
    transit_delay_rate_pct: number;
    transit_delay_benchmark: string;
    weather_valid_pairs: number;
    weather_date_coverage: {
      arrival_dates_count: number;
      weather_dates_count: number;
    };
    rainfall_arrival_correlation: number;
    correlation_interpretation: string;
  };
  top_5_mandis: TopMandi[];
  crop_distribution: CropDistributionItem[];
  warehouse_logistics: WarehouseLogisticsItem[];
}

export interface InsightItem {
  category: string;
  statement: string;
  metric: number;
  comparison: number;
  dataset: string;
  methodology: string;
}

/** Dataset identifiers used by loaders, adapters and the Ask MandiGrid intent engine. */
export type DatasetKey =
  | "crop_summary"
  | "price_msp_analysis"
  | "transport_summary"
  | "daily_mandi_analytics"
  | "mandi_summary"
  | "weather_arrival_analysis"
  | "dashboard_metrics"
  | "insights";

export type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };
