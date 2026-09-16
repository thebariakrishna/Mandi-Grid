import { loadCsv } from "./csvLoader";
import { loadJson } from "./jsonLoader";
import type {
  CropSummaryRow,
  PriceMspRow,
  TransportSummaryRow,
  DailyMandiRow,
  MandiSummaryRow,
  WeatherArrivalRow,
  DashboardMetrics,
  InsightItem,
} from "@/types/analytics";

const BASE = `${import.meta.env.BASE_URL}data`;

/**
 * Each function below lazy-loads exactly one file, the first time it is
 * called, and shares one in-memory cache with every other caller (pages and
 * Ask MandiGrid alike). No dataset is fetched until something on screen
 * actually needs it.
 */
export const getCropSummary = () => loadCsv<CropSummaryRow>(`${BASE}/crop_summary.csv`);
export const getPriceMsp = () => loadCsv<PriceMspRow>(`${BASE}/price_msp_analysis.csv`);
export const getTransportSummary = () =>
  loadCsv<TransportSummaryRow>(`${BASE}/transport_summary.csv`);
export const getDailyMandi = () => loadCsv<DailyMandiRow>(`${BASE}/daily_mandi_analytics.csv`);
export const getMandiSummary = () => loadCsv<MandiSummaryRow>(`${BASE}/mandi_summary.csv`);
export const getWeatherArrival = () =>
  loadCsv<WeatherArrivalRow>(`${BASE}/weather_arrival_analysis.csv`);
export const getDashboardMetrics = () => loadJson<DashboardMetrics>(`${BASE}/dashboard_metrics.json`);
export const getInsights = () => loadJson<InsightItem[]>(`${BASE}/insights.json`);
