import prices from "../../../public/data/prices.json" with { type: "json" };
import { mandis, crops, matchMandiFilter, matchCropFilter, matchDateFilter } from "./filters";
import { calculatePriceCrash, calculateCrashRate, fmt } from "./definitions";
import type { FilterObject, StructuredResult } from "./types";

const priceRows = prices as Array<[string, number, number, number | null, number | null, number | null, number | null]>;

let maxDateStr = "";
for (const r of priceRows) {
  if (r[0] > maxDateStr) maxDateStr = r[0];
}

export function get_price_analysis(filter?: FilterObject): StructuredResult {
  const filtered = priceRows.filter(
    (r) =>
      matchMandiFilter(r[1], filter) &&
      matchCropFilter(r[2], filter) &&
      matchDateFilter(r[0], filter, maxDateStr) &&
      r[3] !== null &&
      r[4] !== null
  );

  if (filtered.length === 0) {
    return {
      success: false,
      questionType: "price_analysis",
      metric: "average_modal_price",
      title: "Wholesale Price Analysis",
      scope: filter || {},
      result: { message: "I don't have enough data in the current dataset/filter scope to calculate price analysis." },
      sampleSize: 0,
      source: "price_msp",
    };
  }

  const modalSum = filtered.reduce((acc, r) => acc + (r[3] || 0), 0);
  const mspSum = filtered.reduce((acc, r) => acc + (r[4] || 0), 0);
  const avgModal = Math.round(modalSum / filtered.length);
  const avgMsp = Math.round(mspSum / filtered.length);
  const mspGapPct = avgMsp > 0 ? Number((((avgModal - avgMsp) / avgMsp) * 100).toFixed(1)) : 0;

  const modals = filtered.map((r) => r[3]!).filter((v) => v > 0);
  const minModal = Math.min(...modals);
  const maxModal = Math.max(...modals);

  // Group by crop for price chart
  const cropPriceMap: Record<number, { modalSum: number; mspSum: number; count: number }> = {};
  filtered.forEach((r) => {
    const cIdx = r[2];
    if (!cropPriceMap[cIdx]) cropPriceMap[cIdx] = { modalSum: 0, mspSum: 0, count: 0 };
    cropPriceMap[cIdx].modalSum += r[3]!;
    cropPriceMap[cIdx].mspSum += r[4]!;
    cropPriceMap[cIdx].count++;
  });

  const chartData = Object.keys(cropPriceMap).map((cIdxStr) => {
    const cIdx = Number(cIdxStr);
    const item = cropPriceMap[cIdx]!;
    return {
      name: crops[cIdx] || "Crop",
      Modal: Math.round(item.modalSum / item.count),
      MSP: Math.round(item.mspSum / item.count),
    };
  });

  const cropBreakdown = chartData
    .map((d) => ({
      crop: d.name,
      avgModalRupees: d.Modal,
      avgMspRupees: d.MSP,
      mspGapPct: d.MSP > 0 ? Number((((d.Modal - d.MSP) / d.MSP) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.avgModalRupees - a.avgModalRupees);

  return {
    success: true,
    questionType: "price_analysis",
    metric: "average_modal_price",
    title: "Wholesale Price & MSP Benchmark Analysis",
    scope: filter || {},
    result: {
      avgModalPriceRupees: avgModal,
      avgMspBenchmarkRupees: avgMsp,
      mspGapPercentage: mspGapPct,
      minModalPriceRupees: minModal,
      maxModalPriceRupees: maxModal,
      totalPriceRecords: filtered.length,
      cropBreakdown,
    },
    sampleSize: filtered.length,
    unit: "₹/qtl",
    source: "price_msp",
    calculationNote: `Calculated mean modal price (₹${fmt(avgModal)}/qtl) and mean MSP (₹${fmt(avgMsp)}/qtl) across ${filtered.length} records`,
    chart: {
      chartType: "bar",
      title: "Average Modal Price vs Government MSP (₹/qtl)",
      unit: "₹/qtl",
      data: chartData.map((d) => ({ name: d.name, value: d.Modal, msp: d.MSP })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_price_crashes(filter?: FilterObject): StructuredResult {
  const filtered = priceRows.filter(
    (r) =>
      matchMandiFilter(r[1], filter) &&
      matchCropFilter(r[2], filter) &&
      matchDateFilter(r[0], filter, maxDateStr) &&
      r[3] !== null &&
      r[4] !== null
  );

  if (filtered.length === 0) {
    return {
      success: false,
      questionType: "price_crashes",
      metric: "price_crash_rate",
      title: "Price Crash Rate Analysis",
      scope: filter || {},
      result: { message: "No price records available in the selected filter scope." },
      sampleSize: 0,
      source: "price_msp",
    };
  }

  const overallCrashRate = calculateCrashRate(filtered.map((r) => ({ modal: r[3], msp: r[4] })));
  const crashCount = filtered.filter((r) => r[3]! < r[4]!).length;

  // Breakdown by crop
  const cropStats: Record<number, { total: number; crashes: number; modalSum: number; mspSum: number }> = {};
  filtered.forEach((r) => {
    const cIdx = r[2];
    if (!cropStats[cIdx]) cropStats[cIdx] = { total: 0, crashes: 0, modalSum: 0, mspSum: 0 };
    cropStats[cIdx].total++;
    cropStats[cIdx].modalSum += r[3]!;
    cropStats[cIdx].mspSum += r[4]!;
    if (r[3]! < r[4]!) cropStats[cIdx].crashes++;
  });

  const cropRankings = Object.keys(cropStats)
    .map((cIdxStr) => {
      const idx = Number(cIdxStr);
      const s = cropStats[idx]!;
      const rate = Number(((s.crashes / s.total) * 100).toFixed(1));
      const avgModal = Math.round(s.modalSum / s.total);
      const avgMsp = Math.round(s.mspSum / s.total);
      return {
        crop: crops[idx] || "Unknown",
        crashRatePct: rate,
        crashCount: s.crashes,
        totalRecords: s.total,
        avgModalRupees: avgModal,
        avgMspRupees: avgMsp,
        mspGapPct: avgMsp > 0 ? Number((((avgModal - avgMsp) / avgMsp) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.crashRatePct - a.crashRatePct);

  // Breakdown by mandi
  const mandiStats: Record<number, { total: number; crashes: number }> = {};
  filtered.forEach((r) => {
    const mIdx = r[1];
    if (!mandiStats[mIdx]) mandiStats[mIdx] = { total: 0, crashes: 0 };
    mandiStats[mIdx].total++;
    if (r[3]! < r[4]!) mandiStats[mIdx].crashes++;
  });

  const mandiRankings = Object.keys(mandiStats)
    .map((mIdxStr) => {
      const idx = Number(mIdxStr);
      const s = mandiStats[idx]!;
      return {
        mandi: mandis[idx]?.name || "Unknown Mandi",
        district: mandis[idx]?.district || "Unknown",
        state: mandis[idx]?.state || "Unknown",
        crashRatePct: Number(((s.crashes / s.total) * 100).toFixed(1)),
        crashes: s.crashes,
        total: s.total,
      };
    })
    .sort((a, b) => b.crashRatePct - a.crashRatePct);

  return {
    success: true,
    questionType: "price_crashes",
    metric: "price_crash_rate",
    title: "Price Crash & Below-MSP Analysis",
    scope: filter || {},
    result: {
      overallPriceCrashRatePct: overallCrashRate,
      totalPriceCrashEvents: crashCount,
      totalRecordsAnalyzed: filtered.length,
      highestCrashCrop: cropRankings[0]?.crop || "None",
      highestCrashCropRatePct: cropRankings[0]?.crashRatePct || 0,
      cropCrashRankings: cropRankings,
      topMandiCrashRankings: mandiRankings.slice(0, 5),
    },
    sampleSize: filtered.length,
    unit: "%",
    source: "price_msp",
    calculationNote: `Calculated % of instances where modal price < MSP across ${filtered.length} price transactions`,
    chart: {
      chartType: "bar",
      title: "Price Crash Rate (% Below MSP) by Crop",
      unit: "%",
      data: cropRankings.map((c) => ({ name: c.crop, value: c.crashRatePct })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}

export function get_best_mandi_for_crop(filter?: FilterObject): StructuredResult {
  const filtered = priceRows.filter(
    (r) =>
      matchMandiFilter(r[1], filter) &&
      matchCropFilter(r[2], filter) &&
      matchDateFilter(r[0], filter, maxDateStr) &&
      r[3] !== null &&
      r[4] !== null
  );

  if (filtered.length === 0) {
    return {
      success: false,
      questionType: "best_mandi_selling",
      metric: "highest_modal_price_mandi",
      title: "Best Mandi Selection for Selling Crop",
      scope: filter || {},
      result: { message: `No price data available to calculate the best mandi for ${filter?.crop || "the selected crop"}.` },
      sampleSize: 0,
      source: "price_msp",
    };
  }

  const mandiPrices: Record<number, { modalSum: number; mspSum: number; count: number }> = {};
  filtered.forEach((r) => {
    const mIdx = r[1];
    if (!mandiPrices[mIdx]) mandiPrices[mIdx] = { modalSum: 0, mspSum: 0, count: 0 };
    mandiPrices[mIdx].modalSum += r[3]!;
    mandiPrices[mIdx].mspSum += r[4]!;
    mandiPrices[mIdx].count++;
  });

  const mandiRankings = Object.keys(mandiPrices)
    .map((mIdxStr) => {
      const idx = Number(mIdxStr);
      const item = mandiPrices[idx]!;
      const avgModal = Math.round(item.modalSum / item.count);
      const avgMsp = Math.round(item.mspSum / item.count);
      const mspGapPct = avgMsp > 0 ? Number((((avgModal - avgMsp) / avgMsp) * 100).toFixed(1)) : 0;
      return {
        mandi: mandis[idx]?.name || "Unknown Mandi",
        district: mandis[idx]?.district || "Unknown",
        state: mandis[idx]?.state || "Unknown",
        avgModalPriceRupees: avgModal,
        avgMspBenchmarkRupees: avgMsp,
        mspGapPct,
        recordsCount: item.count,
      };
    })
    .sort((a, b) => b.avgModalPriceRupees - a.avgModalPriceRupees);

  const bestMandi = mandiRankings[0] || null;
  const targetCrop = filter?.crop || "Crop";

  return {
    success: true,
    questionType: "best_mandi_selling",
    metric: "highest_modal_price_mandi",
    title: `Best Mandis to Sell ${targetCrop} (Highest Wholesale Prices)`,
    scope: filter || {},
    result: {
      bestMandiToSell: bestMandi ? `${bestMandi.mandi} (${bestMandi.district}, ${bestMandi.state})` : "None",
      highestAverageModalPriceRupees: bestMandi ? bestMandi.avgModalPriceRupees : 0,
      governmentMspBenchmarkRupees: bestMandi ? bestMandi.avgMspBenchmarkRupees : 0,
      mspGapPct: bestMandi ? bestMandi.mspGapPct : 0,
      topMandisForSelling: mandiRankings.slice(0, 8),
    },
    sampleSize: filtered.length,
    unit: "₹/qtl",
    source: "price_msp",
    calculationNote: `Calculated average wholesale modal prices across ${mandiRankings.length} mandis for ${targetCrop}`,
    chart: {
      chartType: "bar",
      title: `Top Mandis by ${targetCrop} Wholesale Price (₹/qtl)`,
      unit: "₹/qtl",
      data: mandiRankings.slice(0, 8).map((m) => ({ name: m.mandi, value: m.avgModalPriceRupees })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}

