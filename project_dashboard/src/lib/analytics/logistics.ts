import transport from "../../../public/data/transport.json" with { type: "json" };
import { mandis, warehouses, matchMandiFilter, matchDateFilter } from "./filters";
import { expectedHours, calculateDelay, calculateAverageTransit, fmt } from "./definitions";
import type { FilterObject, StructuredResult } from "./types";

const transportRows = transport as Array<[string, number, number, number | null, number | null]>;

let maxDateStr = "";
for (const r of transportRows) {
  if (r[0] > maxDateStr) maxDateStr = r[0];
}

export function get_logistics_analysis(filter?: FilterObject): StructuredResult {
  const filtered = transportRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchDateFilter(r[0], filter, maxDateStr) && r[3] !== null && r[4] !== null
  );

  if (filtered.length === 0) {
    return {
      success: false,
      questionType: "logistics_analysis",
      metric: "average_transit_hours",
      title: "Transit Logistics & Delay Analysis",
      scope: filter || {},
      result: { message: "No transport records match the current filter scope." },
      sampleSize: 0,
      source: "transport_logistics",
    };
  }

  const validHours = filtered.map((r) => r[3]!).filter((h) => h > 0);
  const avgTransitHours = calculateAverageTransit(validHours);

  let delayedTrips = 0;
  filtered.forEach((r) => {
    if (calculateDelay(r[3], r[4])) delayedTrips++;
  });

  const overallDelayRatePct = Number(((delayedTrips / filtered.length) * 100).toFixed(1));

  // Mandi breakdown
  const mandiLogistics: Record<number, { total: number; delayed: number; hoursSum: number; distSum: number }> = {};
  filtered.forEach((r) => {
    const mIdx = r[1];
    if (!mandiLogistics[mIdx]) mandiLogistics[mIdx] = { total: 0, delayed: 0, hoursSum: 0, distSum: 0 };
    mandiLogistics[mIdx].total++;
    mandiLogistics[mIdx].hoursSum += r[3]!;
    mandiLogistics[mIdx].distSum += r[4]!;
    if (calculateDelay(r[3], r[4])) mandiLogistics[mIdx].delayed++;
  });

  const mandiRankings = Object.keys(mandiLogistics)
    .map((mIdxStr) => {
      const idx = Number(mIdxStr);
      const item = mandiLogistics[idx]!;
      const avgH = Number((item.hoursSum / item.total).toFixed(2));
      const delayPct = Number(((item.delayed / item.total) * 100).toFixed(1));
      return {
        mandi: mandis[idx]?.name || "Unknown Mandi",
        district: mandis[idx]?.district || "Unknown",
        state: mandis[idx]?.state || "Unknown",
        avgTransitHours: avgH,
        delayedShipments: item.delayed,
        totalShipments: item.total,
        delayRatePct: delayPct,
        avgDistanceKm: Math.round(item.distSum / item.total),
      };
    })
    .sort((a, b) => b.avgTransitHours - a.avgTransitHours);

  const highestTransitMandi = mandiRankings[0] || null;
  const lowestTransitMandi = mandiRankings[mandiRankings.length - 1] || null;

  return {
    success: true,
    questionType: "highest_transit_delay",
    metric: "average_transit_hours",
    title: "Mandi Transit Logistics & Delay Rankings",
    scope: filter || {},
    result: {
      highestTransitDelayMandi: highestTransitMandi ? `${highestTransitMandi.mandi} (${highestTransitMandi.district}, ${highestTransitMandi.state})` : "None",
      highestAverageTransitHours: highestTransitMandi ? highestTransitMandi.avgTransitHours : 0,
      highestMandiDelayRatePct: highestTransitMandi ? highestTransitMandi.delayRatePct : 0,
      highestMandiDelayedShipments: highestTransitMandi ? highestTransitMandi.delayedShipments : 0,
      highestMandiTotalShipments: highestTransitMandi ? highestTransitMandi.totalShipments : 0,
      lowestTransitDelayMandi: lowestTransitMandi ? `${lowestTransitMandi.mandi} (${lowestTransitMandi.district}, ${lowestTransitMandi.state})` : "None",
      lowestAverageTransitHours: lowestTransitMandi ? lowestTransitMandi.avgTransitHours : 0,
      lowestMandiDelayRatePct: lowestTransitMandi ? lowestTransitMandi.delayRatePct : 0,
      lowestMandiDelayedShipments: lowestTransitMandi ? lowestTransitMandi.delayedShipments : 0,
      lowestMandiTotalShipments: lowestTransitMandi ? lowestTransitMandi.totalShipments : 0,
      overallAverageTransitHours: avgTransitHours,
      overallDelayRatePct: overallDelayRatePct,
      totalShipmentsAnalyzed: filtered.length,
      topMandisByTransitDelay: mandiRankings.slice(0, 8),
      bottomMandisByTransitDelay: mandiRankings.slice(-5).reverse(),
    },
    sampleSize: filtered.length,
    unit: "hours",
    source: "transport_logistics",
    calculationNote: `Calculated mean transit hours and delay rate (> distance/45 + 1.5 hrs) across ${filtered.length} transport logs`,
    chart: {
      chartType: "bar",
      title: "Top Mandis by Average Transit Duration (Hours)",
      unit: "hours",
      data: mandiRankings.slice(0, 8).map((m) => ({ name: m.mandi, value: m.avgTransitHours })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_warehouse_delays(filter?: FilterObject): StructuredResult {
  const filtered = transportRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchDateFilter(r[0], filter, maxDateStr) && r[3] !== null && r[4] !== null
  );

  if (filtered.length === 0) {
    return {
      success: false,
      questionType: "warehouse_delays",
      metric: "warehouse_delay_rate",
      title: "Destination Warehouse Delay Analysis",
      scope: filter || {},
      result: { message: "No transport records match the current filter scope." },
      sampleSize: 0,
      source: "transport_logistics",
    };
  }

  const warehouseMap: Record<number, { total: number; delayed: number; hoursSum: number; distSum: number }> = {};
  filtered.forEach((r) => {
    const wIdx = r[2];
    if (!warehouseMap[wIdx]) warehouseMap[wIdx] = { total: 0, delayed: 0, hoursSum: 0, distSum: 0 };
    warehouseMap[wIdx].total++;
    warehouseMap[wIdx].hoursSum += r[3]!;
    warehouseMap[wIdx].distSum += r[4]!;
    if (calculateDelay(r[3], r[4])) warehouseMap[wIdx].delayed++;
  });

  const rankings = Object.keys(warehouseMap)
    .map((wIdxStr) => {
      const idx = Number(wIdxStr);
      const item = warehouseMap[idx]!;
      const delayRate = Number(((item.delayed / item.total) * 100).toFixed(1));
      const avgTransit = Number((item.hoursSum / item.total).toFixed(2));
      return {
        warehouse: warehouses[idx] || `Warehouse ${idx}`,
        delayRatePct: delayRate,
        avgTransitHours: avgTransit,
        delayedTrips: item.delayed,
        totalTrips: item.total,
        avgDistanceKm: Math.round(item.distSum / item.total),
      };
    })
    .sort((a, b) => b.delayRatePct - a.delayRatePct);

  const topWarehouse = rankings[0] || null;
  const bottomWarehouse = rankings[rankings.length - 1] || null;

  return {
    success: true,
    questionType: "warehouse_delays",
    metric: "warehouse_delay_rate",
    title: "Destination Warehouse Delay & Transit Analysis",
    scope: filter || {},
    result: {
      highestDelayWarehouse: topWarehouse ? topWarehouse.warehouse : "None",
      highestWarehouseDelayRatePct: topWarehouse ? topWarehouse.delayRatePct : 0,
      highestWarehouseAvgTransitHours: topWarehouse ? topWarehouse.avgTransitHours : 0,
      lowestDelayWarehouse: bottomWarehouse ? bottomWarehouse.warehouse : "None",
      lowestWarehouseDelayRatePct: bottomWarehouse ? bottomWarehouse.delayRatePct : 0,
      lowestWarehouseAvgTransitHours: bottomWarehouse ? bottomWarehouse.avgTransitHours : 0,
      totalWarehousesMonitored: rankings.length,
      warehouseRankings: rankings,
    },
    sampleSize: filtered.length,
    unit: "%",
    source: "transport_logistics",
    calculationNote: `Calculated % of incoming shipments delayed per warehouse across ${filtered.length} trips`,
    chart: {
      chartType: "bar",
      title: "Warehouse Delay Rate (% Delayed Trips)",
      unit: "%",
      data: rankings.map((w) => ({ name: w.warehouse, value: w.delayRatePct })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}
