import meta from "../../../public/data/meta.json" with { type: "json" };
import arrivals from "../../../public/data/arrivals.json" with { type: "json" };
import prices from "../../../public/data/prices.json" with { type: "json" };
import transport from "../../../public/data/transport.json" with { type: "json" };
import { mandis, crops, warehouses, matchMandiFilter, matchCropFilter, matchDateFilter, norm } from "./filters";
import { calculateCrashRate, calculateAverageTransit, calculateDelay, fmt } from "./definitions";
import type { FilterObject, StructuredResult } from "./types";

const arrivalRows = arrivals as Array<[string, number, number, number, number]>;
const priceRows = prices as Array<[string, number, number, number | null, number | null, number | null, number | null]>;
const transportRows = transport as Array<[string, number, number, number | null, number | null]>;

export function get_dataset_overview(): StructuredResult {
  const punjabCount = mandis.filter((m) => m.state === "Punjab").length;
  const haryanaCount = mandis.filter((m) => m.state === "Haryana").length;
  const upCount = mandis.filter((m) => m.state === "Uttar Pradesh").length;

  const totalArrivalsQtl = Math.round(arrivalRows.reduce((a, b) => a + b[3], 0));
  
  const validPrices = priceRows.filter((p) => p[3] !== null && p[4] !== null);
  const avgPrice = Math.round(validPrices.reduce((a, b) => a + b[3]!, 0) / validPrices.length);

  return {
    success: true,
    questionType: "dataset_overview",
    metric: "dataset_summary",
    title: "MandiGrid Real Agricultural Dataset Overview",
    scope: {},
    result: {
      totalMandis: mandis.length,
      statesCovered: ["Punjab", "Haryana", "Uttar Pradesh"],
      mandiDistribution: { Punjab: punjabCount, Haryana: haryanaCount, "Uttar Pradesh": upCount },
      cropsMonitored: crops,
      totalArrivalRecords: arrivalRows.length,
      totalArrivalVolumeQtl: totalArrivalsQtl,
      totalPriceRecords: priceRows.length,
      overallAverageModalPriceRupees: avgPrice,
      totalTransportLogs: transportRows.length,
    },
    sampleSize: arrivalRows.length + priceRows.length + transportRows.length,
    unit: "records",
    source: "mandi_master",
    calculationNote: `Calculated from verified local JSON files across 57 mandis and 6 crop commodities`,
    chart: {
      chartType: "pie",
      title: "Mandi Distribution by State",
      unit: "mandis",
      data: [
        { name: "Punjab", value: punjabCount },
        { name: "Haryana", value: haryanaCount },
        { name: "Uttar Pradesh", value: upCount },
      ],
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function compare_states(stateA: string, stateB: string, filter?: FilterObject): StructuredResult {
  const sA = norm(stateA);
  const sB = norm(stateB);

  const getStatsForState = (stName: string) => {
    const stNorm = norm(stName);
    const stateMandis = mandis.filter((m) => norm(m.state) === stNorm);
    const mandiIndices = new Set(stateMandis.map((m) => mandis.indexOf(m)));

    const stArrivals = arrivalRows.filter((r) => mandiIndices.has(r[1]) && matchCropFilter(r[2], filter));
    const totalVolume = Math.round(stArrivals.reduce((a, b) => a + b[3], 0));

    const stPrices = priceRows.filter((r) => mandiIndices.has(r[1]) && matchCropFilter(r[2], filter) && r[3] !== null && r[4] !== null);
    const avgModal = stPrices.length > 0 ? Math.round(stPrices.reduce((a, b) => a + b[3]!, 0) / stPrices.length) : 0;
    const avgMsp = stPrices.length > 0 ? Math.round(stPrices.reduce((a, b) => a + b[4]!, 0) / stPrices.length) : 0;
    const crashRate = calculateCrashRate(stPrices.map((p) => ({ modal: p[3], msp: p[4] })));

    const stTransport = transportRows.filter((r) => mandiIndices.has(r[1]) && r[3] !== null && r[4] !== null);
    const avgTransit = calculateAverageTransit(stTransport.map((t) => t[3]));
    const delayedCount = stTransport.filter((t) => calculateDelay(t[3], t[4])).length;
    const delayRate = stTransport.length > 0 ? Number(((delayedCount / stTransport.length) * 100).toFixed(1)) : 0;

    return {
      state: stName,
      mandiCount: stateMandis.length,
      totalArrivalVolumeQtl: totalVolume,
      avgModalPriceRupees: avgModal,
      avgMspRupees: avgMsp,
      priceCrashRatePct: crashRate,
      avgTransitHours: avgTransit,
      delayRatePct: delayRate,
    };
  };

  const statsA = getStatsForState(stateA);
  const statsB = getStatsForState(stateB);

  return {
    success: true,
    questionType: "state_comparison",
    metric: "state_metrics_comparison",
    title: `Comparative Analysis: ${stateA} vs ${stateB}`,
    scope: filter || {},
    result: {
      stateA: statsA,
      stateB: statsB,
    },
    sampleSize: mandis.length,
    source: "mandi_master",
    calculationNote: `Direct aggregate calculation for ${stateA} and ${stateB}`,
    chart: {
      chartType: "bar",
      title: `${stateA} vs ${stateB} Total Arrivals (qtl)`,
      unit: "qtl",
      data: [
        { name: statsA.state, value: statsA.totalArrivalVolumeQtl },
        { name: statsB.state, value: statsB.totalArrivalVolumeQtl },
      ],
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function compare_crops(cropA: string, cropB: string, filter?: FilterObject): StructuredResult {
  const cAIdx = crops.findIndex((c) => norm(c) === norm(cropA));
  const cBIdx = crops.findIndex((c) => norm(c) === norm(cropB));

  const getStatsForCrop = (cIdx: number, cName: string) => {
    if (cIdx === -1) {
      return { crop: cName, totalArrivalVolumeQtl: 0, avgModalPriceRupees: 0, avgMspRupees: 0, crashRatePct: 0 };
    }
    const cArrivals = arrivalRows.filter((r) => r[2] === cIdx && matchMandiFilter(r[1], filter));
    const totalVol = Math.round(cArrivals.reduce((a, b) => a + b[3], 0));

    const cPrices = priceRows.filter((r) => r[2] === cIdx && matchMandiFilter(r[1], filter) && r[3] !== null && r[4] !== null);
    const avgModal = cPrices.length > 0 ? Math.round(cPrices.reduce((a, b) => a + b[3]!, 0) / cPrices.length) : 0;
    const avgMsp = cPrices.length > 0 ? Math.round(cPrices.reduce((a, b) => a + b[4]!, 0) / cPrices.length) : 0;
    const crashRate = calculateCrashRate(cPrices.map((p) => ({ modal: p[3], msp: p[4] })));

    return {
      crop: cName,
      totalArrivalVolumeQtl: totalVol,
      avgModalPriceRupees: avgModal,
      avgMspRupees: avgMsp,
      crashRatePct: crashRate,
    };
  };

  const statsA = getStatsForCrop(cAIdx, cropA);
  const statsB = getStatsForCrop(cBIdx, cropB);

  return {
    success: true,
    questionType: "crop_comparison",
    metric: "crop_metrics_comparison",
    title: `Comparative Analysis: ${cropA} vs ${cropB}`,
    scope: filter || {},
    result: { cropA: statsA, cropB: statsB },
    sampleSize: arrivalRows.length + priceRows.length,
    source: "mandi_arrivals",
    calculationNote: `Calculated metrics for ${cropA} and ${cropB}`,
    chart: {
      chartType: "bar",
      title: `${cropA} vs ${cropB} Modal Price (₹/qtl)`,
      unit: "₹/qtl",
      data: [
        { name: statsA.crop, value: statsA.avgModalPriceRupees },
        { name: statsB.crop, value: statsB.avgModalPriceRupees },
      ],
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_top_mandis(metric: string, filter?: FilterObject, limit = 5): StructuredResult {
  const normMetric = norm(metric);
  if (normMetric.includes("delay") || normMetric.includes("transit") || normMetric.includes("logistics")) {
    const { get_logistics_analysis } = require("./logistics");
    return get_logistics_analysis(filter);
  } else if (normMetric.includes("crash") || normMetric.includes("msp") || normMetric.includes("price")) {
    const { get_price_crashes } = require("./pricing");
    return get_price_crashes(filter);
  }
  const { get_mandi_arrivals } = require("./arrivals");
  return get_mandi_arrivals(filter);
}

export function get_top_crops(metric: string, filter?: FilterObject, limit = 5): StructuredResult {
  const normMetric = norm(metric);
  if (normMetric.includes("crash") || normMetric.includes("msp")) {
    const { get_price_crashes } = require("./pricing");
    return get_price_crashes(filter);
  }
  const { get_crop_arrivals } = require("./arrivals");
  return get_crop_arrivals(filter);
}

export function get_top_warehouses(metric: string, filter?: FilterObject, limit = 5): StructuredResult {
  const { get_warehouse_delays } = require("./logistics");
  return get_warehouse_delays(filter);
}
