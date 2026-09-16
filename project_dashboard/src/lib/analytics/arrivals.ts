import arrivals from "../../../public/data/arrivals.json" with { type: "json" };
import { mandis, crops, matchMandiFilter, matchCropFilter, matchDateFilter, norm } from "./filters";
import { fmt } from "./definitions";
import type { FilterObject, StructuredResult } from "./types";

const arrivalRows = arrivals as Array<[string, number, number, number, number]>;

let maxDateStr = "";
for (const r of arrivalRows) {
  if (r[0] > maxDateStr) maxDateStr = r[0];
}

export function get_arrival_summary(filter?: FilterObject): StructuredResult {
  const filtered = arrivalRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchCropFilter(r[2], filter) && matchDateFilter(r[0], filter, maxDateStr)
  );

  const totalVolume = filtered.reduce((acc, r) => acc + r[3], 0);
  const totalFarmers = filtered.reduce((acc, r) => acc + r[4], 0);
  const avgArrivalPerRecord = filtered.length > 0 ? totalVolume / filtered.length : 0;

  return {
    success: true,
    questionType: "arrival_summary",
    metric: "total_arrival_volume",
    title: "Arrival Volume Summary",
    scope: filter || {},
    result: {
      totalVolumeQtl: Math.round(totalVolume),
      totalFarmers,
      recordCount: filtered.length,
      avgArrivalPerRecord: Math.round(avgArrivalPerRecord),
    },
    sampleSize: filtered.length,
    unit: "qtl",
    source: "mandi_arrivals",
    calculationNote: `Sum of arrival quantities (qtl) across ${filtered.length} filtered records`,
  };
}

export function get_daily_arrivals(filter?: FilterObject): StructuredResult {
  const filtered = arrivalRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchCropFilter(r[2], filter) && matchDateFilter(r[0], filter, maxDateStr)
  );

  const dailyMap: Record<string, number> = {};
  filtered.forEach((r) => {
    const d = r[0];
    dailyMap[d] = (dailyMap[d] || 0) + r[3];
  });

  const dates = Object.keys(dailyMap).sort();
  const chartData = dates.map((d) => ({ name: d, value: Math.round(dailyMap[d]!) }));

  let maxDay = "";
  let maxVal = 0;
  dates.forEach((d) => {
    const val = dailyMap[d]!;
    if (val > maxVal) {
      maxVal = val;
      maxDay = d;
    }
  });

  return {
    success: true,
    questionType: "daily_arrivals",
    metric: "daily_arrival_totals",
    title: "Daily Arrival Volume Breakdown",
    scope: filter || {},
    result: {
      highestArrivalDay: maxDay,
      highestArrivalVolumeQtl: Math.round(maxVal),
      totalDays: dates.length,
      avgDailyArrivalQtl: dates.length > 0 ? Math.round(filtered.reduce((a, b) => a + b[3], 0) / dates.length) : 0,
    },
    sampleSize: filtered.length,
    unit: "qtl",
    source: "mandi_arrivals",
    calculationNote: `Aggregated daily total arrivals over ${dates.length} days`,
    chart: {
      chartType: "line",
      title: "Daily Arrival Volume Trend",
      unit: "qtl",
      data: chartData.slice(-30), // Last 30 points for crisp visual
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_mandi_arrivals(filter?: FilterObject): StructuredResult {
  const filtered = arrivalRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchCropFilter(r[2], filter) && matchDateFilter(r[0], filter, maxDateStr)
  );

  const mandiMap: Record<number, number> = {};
  filtered.forEach((r) => {
    mandiMap[r[1]] = (mandiMap[r[1]] || 0) + r[3];
  });

  const rankings = Object.keys(mandiMap)
    .map((mIdxStr) => {
      const idx = Number(mIdxStr);
      return {
        mandiIdx: idx,
        name: mandis[idx]?.name || "Unknown Mandi",
        district: mandis[idx]?.district || "Unknown",
        state: mandis[idx]?.state || "Unknown",
        volume: Math.round(mandiMap[idx]!),
      };
    })
    .sort((a, b) => b.volume - a.volume);

  const topMandi = rankings[0] || null;

  return {
    success: true,
    questionType: "mandi_arrivals",
    metric: "mandi_arrival_volume",
    title: "Mandi Arrival Rankings",
    scope: filter || {},
    result: {
      topMandi: topMandi ? `${topMandi.name} (${topMandi.district}, ${topMandi.state})` : "None",
      topVolumeQtl: topMandi ? topMandi.volume : 0,
      totalActiveMandis: rankings.length,
      mandiRankings: rankings.slice(0, 10),
    },
    sampleSize: filtered.length,
    unit: "qtl",
    source: "mandi_arrivals",
    calculationNote: "Grouped by Mandi and calculated total quintals received",
    chart: {
      chartType: "bar",
      title: "Top Mandis by Arrival Volume",
      unit: "qtl",
      data: rankings.slice(0, 8).map((r) => ({ name: r.name, value: r.volume })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_crop_arrivals(filter?: FilterObject): StructuredResult {
  const filtered = arrivalRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchCropFilter(r[2], filter) && matchDateFilter(r[0], filter, maxDateStr)
  );

  const cropMap: Record<number, number> = {};
  filtered.forEach((r) => {
    cropMap[r[2]] = (cropMap[r[2]] || 0) + r[3];
  });

  const totalVol = filtered.reduce((a, b) => a + b[3], 0);

  const rankings = Object.keys(cropMap)
    .map((cIdxStr) => {
      const idx = Number(cIdxStr);
      const vol = Math.round(cropMap[idx]!);
      return {
        cropIdx: idx,
        name: crops[idx] || "Unknown Crop",
        volume: vol,
        sharePct: totalVol > 0 ? Number(((vol / totalVol) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.volume - a.volume);

  return {
    success: true,
    questionType: "crop_arrivals",
    metric: "crop_arrival_volume",
    title: "Crop Volume Breakdown",
    scope: filter || {},
    result: {
      topCrop: rankings[0]?.name || "None",
      topCropVolumeQtl: rankings[0]?.volume || 0,
      cropBreakdown: rankings,
    },
    sampleSize: filtered.length,
    unit: "qtl",
    source: "mandi_arrivals",
    calculationNote: "Summed total quintals per crop",
    chart: {
      chartType: "pie",
      title: "Crop Arrival Share",
      unit: "qtl",
      data: rankings.map((r) => ({ name: r.name, value: r.volume })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_state_arrivals(filter?: FilterObject): StructuredResult {
  const filtered = arrivalRows.filter(
    (r) => matchMandiFilter(r[1], filter) && matchCropFilter(r[2], filter) && matchDateFilter(r[0], filter, maxDateStr)
  );

  const stateMap: Record<string, number> = {};
  filtered.forEach((r) => {
    const st = mandis[r[1]]?.state || "Other";
    stateMap[st] = (stateMap[st] || 0) + r[3];
  });

  const rankings = Object.entries(stateMap)
    .map(([stateName, vol]) => ({ name: stateName, value: Math.round(vol) }))
    .sort((a, b) => b.value - a.value);

  return {
    success: true,
    questionType: "state_arrivals",
    metric: "state_arrival_volume",
    title: "State Arrival Volume Distribution",
    scope: filter || {},
    result: {
      topState: rankings[0]?.name || "None",
      topStateVolumeQtl: rankings[0]?.value || 0,
      stateBreakdown: rankings,
    },
    sampleSize: filtered.length,
    unit: "qtl",
    source: "mandi_arrivals",
    calculationNote: "Arrivals grouped by Mandi State",
    chart: {
      chartType: "bar",
      title: "Arrivals by State",
      unit: "qtl",
      data: rankings,
      xAxis: "name",
      yAxis: "value",
    },
  };
}
