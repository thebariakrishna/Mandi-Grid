import type { FilterObject, StructuredResult } from "./types";
import { get_dataset_overview, compare_states, compare_crops, get_top_mandis, get_top_crops, get_top_warehouses } from "./mandi";
import { get_arrival_summary, get_daily_arrivals, get_mandi_arrivals, get_crop_arrivals, get_state_arrivals } from "./arrivals";
import { get_price_analysis, get_price_crashes, get_best_mandi_for_crop } from "./pricing";
import { get_logistics_analysis, get_warehouse_delays } from "./logistics";
import { get_weather_analysis } from "./weather";
import { mandis, crops, warehouses, districts, norm } from "./filters";
import { fmt } from "./definitions";

export * from "./types";
export * from "./definitions";
export * from "./filters";
export {
  get_dataset_overview,
  get_arrival_summary,
  get_daily_arrivals,
  get_mandi_arrivals,
  get_crop_arrivals,
  get_state_arrivals,
  get_price_analysis,
  get_price_crashes,
  get_best_mandi_for_crop,
  get_logistics_analysis,
  get_warehouse_delays,
  get_weather_analysis,
  compare_states,
  compare_crops,
  get_top_mandis,
  get_top_crops,
  get_top_warehouses,
};

/**
 * Format any calculated StructuredResult into natural language markdown explanation with embedded chart JSON
 */
export function formatResultToMarkdown(res: StructuredResult): string {
  if (!res.success) {
    return (res.result as any).message || "I don't have enough data in the current dataset/filter scope to calculate that.";
  }

  let text = `### 📊 ${res.title}\n`;

  // Filter scope note
  const scopeItems = [];
  if (res.scope.state && res.scope.state !== "All") scopeItems.push(`State: **${res.scope.state}**`);
  if (res.scope.district && res.scope.district !== "All") scopeItems.push(`District: **${res.scope.district}**`);
  if (res.scope.mandi && res.scope.mandi !== "All") scopeItems.push(`Mandi: **${res.scope.mandi}**`);
  if (res.scope.crop && res.scope.crop !== "All") scopeItems.push(`Crop: **${res.scope.crop}**`);
  if (res.scope.days && res.scope.days > 0) scopeItems.push(`Last **${res.scope.days} Days**`);

  if (scopeItems.length > 0) {
    text += `*Scope: ${scopeItems.join(" | ")}*\n\n`;
  } else {
    text += `*Scope: All Data*\n\n`;
  }

  // Key metrics
  const r: any = res.result;
  if (res.questionType === "best_mandi_selling") {
    text += `- **Best Mandi to Sell**: **${r.bestMandiToSell}**\n`;
    text += `- **Highest Average Wholesale Price**: **₹${fmt(r.highestAverageModalPriceRupees)}/qtl**\n`;
    text += `- **Government MSP Benchmark**: **₹${fmt(r.governmentMspBenchmarkRupees)}/qtl** (MSP Gap: ${r.mspGapPct >= 0 ? "+" : ""}${r.mspGapPct}%)\n`;
    if (r.topMandisForSelling && r.topMandisForSelling.length > 1) {
      text += `\n#### Top Mandis by Wholesale Price:\n`;
      r.topMandisForSelling.slice(0, 5).forEach((m: any, i: number) => {
        text += `${i + 1}. **${m.mandi}** (${m.district}, ${m.state}): **₹${fmt(m.avgModalPriceRupees)}/qtl** (MSP Gap: ${m.mspGapPct >= 0 ? "+" : ""}${m.mspGapPct}%)\n`;
      });
    }
  } else if (res.questionType === "highest_transit_delay") {
    text += `- **Highest Transit Delay Mandi**: **${r.highestTransitDelayMandi}** (${r.highestMandiDelayRatePct}% delay rate, ${r.highestAverageTransitHours} hrs)\n`;
    if (r.lowestTransitDelayMandi) {
      text += `- **Lowest Transit Delay Mandi**: **${r.lowestTransitDelayMandi}** (${r.lowestMandiDelayRatePct}% delay rate, ${r.lowestAverageTransitHours} hrs)\n`;
    }
    text += `- **Overall Dataset Average Transit**: **${r.overallAverageTransitHours} hours** (${r.overallDelayRatePct}% delay rate)\n`;
    text += `- **Total Shipments Analyzed**: **${fmt(r.totalShipmentsAnalyzed)}**\n`;
  } else if (res.questionType === "warehouse_delays") {
    text += `- **Highest Delay Warehouse**: **${r.highestDelayWarehouse}** (${r.highestWarehouseDelayRatePct}% delay rate)\n`;
    if (r.lowestDelayWarehouse) {
      text += `- **Lowest Delay Warehouse**: **${r.lowestDelayWarehouse}** (${r.lowestWarehouseDelayRatePct}% delay rate)\n`;
    }
    text += `- **Total Warehouses Monitored**: **${r.totalWarehousesMonitored}**\n`;
  } else if (res.questionType === "mandi_arrivals") {
    text += `- **Top Mandi by Volume**: **${r.topMandi}** (${fmt(r.topVolumeQtl)} qtl)\n`;
    if (r.bottomMandi) {
      text += `- **Lowest Mandi by Volume**: **${r.bottomMandi}** (${fmt(r.bottomVolumeQtl)} qtl)\n`;
    }
    if (r.mandiRankings && r.mandiRankings.length > 1) {
      text += `\n#### Top Mandis Ranking:\n`;
      r.mandiRankings.slice(0, 5).forEach((m: any, i: number) => {
        text += `${i + 1}. **${m.name}** (${m.district}, ${m.state}): **${fmt(m.volume)} qtl**\n`;
      });
    }
  } else if (res.questionType === "state_arrivals") {
    text += `- **Top State by Volume**: **${r.topState}** (**${fmt(r.topStateVolumeQtl)} qtl**)\n`;
    if (r.bottomState) {
      text += `- **Lowest State by Volume**: **${r.bottomState}** (**${fmt(r.bottomStateVolumeQtl)} qtl**)\n`;
    }
    if (r.stateBreakdown) {
      text += `\n#### State Arrival Breakdown:\n`;
      r.stateBreakdown.forEach((s: any) => {
        text += `- **${s.name}**: **${fmt(s.value)} qtl**\n`;
      });
    }
  } else if (res.questionType === "crop_arrivals") {
    text += `- **Top Volume Crop**: **${r.topCrop}** (**${fmt(r.topCropVolumeQtl)} qtl**)\n`;
    if (r.bottomCrop) {
      text += `- **Lowest Volume Crop**: **${r.bottomCrop}** (**${fmt(r.bottomCropVolumeQtl)} qtl**)\n`;
    }
    if (r.cropBreakdown) {
      text += `\n#### Crop Volume Share:\n`;
      r.cropBreakdown.forEach((c: any) => {
        text += `- **${c.name}**: **${fmt(c.volume)} qtl** (${c.sharePct}% share)\n`;
      });
    }
  } else if (res.questionType === "price_crashes") {
    text += `- **Highest Crash Rate Crop**: **${r.highestCrashCrop}** (**${r.highestCrashCropRatePct}%** below MSP)\n`;
    text += `- **Overall Price Crash Rate**: **${r.overallPriceCrashRatePct}%** across all records (${fmt(r.totalPriceCrashEvents || 0)} events)\n`;
    if (r.cropCrashRankings) {
      text += `\n#### Crop Price Crash Breakdown:\n`;
      r.cropCrashRankings.forEach((c: any) => {
        text += `- **${c.crop}**: Crash Rate **${c.crashRatePct}%** | Avg Modal: **₹${fmt(c.avgModalRupees)}/qtl** vs MSP: **₹${fmt(c.avgMspRupees)}/qtl** (Gap: ${c.mspGapPct}%)\n`;
      });
    }
  } else if (res.questionType === "price_analysis") {
    text += `- **Average Wholesale Modal Price**: **₹${fmt(r.avgModalPriceRupees)}/qtl**\n`;
    text += `- **Government MSP Benchmark**: **₹${fmt(r.avgMspBenchmarkRupees)}/qtl**\n`;
    text += `- **MSP Gap Percentage**: **${r.mspGapPercentage >= 0 ? "+" : ""}${r.mspGapPercentage}%**\n`;
    text += `- **Min - Max Modal Price Range**: **₹${fmt(r.minModalPriceRupees)}/qtl** to **₹${fmt(r.maxModalPriceRupees)}/qtl**\n`;
    if (r.cropBreakdown && r.cropBreakdown.length > 1) {
      text += `\n#### Wholesale Price Breakdown by Crop:\n`;
      r.cropBreakdown.forEach((c: any) => {
        text += `- **${c.crop}**: Avg Modal **₹${fmt(c.avgModalRupees)}/qtl** vs MSP **₹${fmt(c.avgMspRupees)}/qtl** (MSP Gap: ${c.mspGapPct >= 0 ? "+" : ""}${c.mspGapPct}%)\n`;
      });
    }
  } else if (res.questionType === "weather_analysis") {
    text += `- **Maximum Recorded Rainfall**: **${r.maxRecordedRainfallMm} mm** (${r.highestRainfallDistrict} District)\n`;
    text += `- **Average Daily Rainfall**: **${r.avgDailyRainfallMm} mm**\n`;
    text += `- **Average Temperature**: **${r.avgTemperatureCelsius} °C**\n`;
    text += `- **Rainfall & Arrival Correlation (r)**: **${r.rainfallArrivalCorrelationR}** (*${r.correlationInterpretation}*)\n`;
  } else if (res.questionType === "daily_arrivals") {
    text += `- **Peak Arrival Date**: **${r.highestArrivalDay}** (**${fmt(r.highestArrivalVolumeQtl)} qtl**)\n`;
    if (r.lowestArrivalDay) {
      text += `- **Lowest Arrival Date**: **${r.lowestArrivalDay}** (**${fmt(r.lowestArrivalVolumeQtl)} qtl**)\n`;
    }
    text += `- **Average Daily Arrival Volume**: **${fmt(r.avgDailyArrivalQtl)} qtl/day**\n`;
  } else if (res.questionType === "state_comparison") {
    const a = r.stateA;
    const b = r.stateB;
    text += `| Metric | ${a.state} | ${b.state} |\n`;
    text += `| :--- | :--- | :--- |\n`;
    text += `| **Active Mandis** | ${a.mandiCount} mandis | ${b.mandiCount} mandis |\n`;
    text += `| **Total Arrivals** | ${fmt(a.totalArrivalVolumeQtl)} qtl | ${fmt(b.totalArrivalVolumeQtl)} qtl |\n`;
    text += `| **Avg Modal Price** | ₹${fmt(a.avgModalPriceRupees)}/qtl | ₹${fmt(b.avgModalPriceRupees)}/qtl |\n`;
    text += `| **Price Crash Rate** | ${a.priceCrashRatePct}% | ${b.priceCrashRatePct}% |\n`;
    text += `| **Avg Transit Delay** | ${a.avgTransitHours} hrs | ${b.avgTransitHours} hrs |\n\n`;
  } else if (res.questionType === "crop_comparison") {
    const a = r.cropA;
    const b = r.cropB;
    text += `| Metric | ${a.crop} | ${b.crop} |\n`;
    text += `| :--- | :--- | :--- |\n`;
    text += `| **Arrival Volume** | ${fmt(a.totalArrivalVolumeQtl)} qtl | ${fmt(b.totalArrivalVolumeQtl)} qtl |\n`;
    text += `| **Avg Modal Price** | ₹${fmt(a.avgModalPriceRupees)}/qtl | ₹${fmt(b.avgModalPriceRupees)}/qtl |\n`;
    text += `| **Government MSP** | ₹${fmt(a.avgMspRupees)}/qtl | ₹${fmt(b.avgMspRupees)}/qtl |\n`;
    text += `| **Price Crash Rate** | ${a.crashRatePct}% | ${b.crashRatePct}% |\n\n`;
  } else {
    Object.entries(r).forEach(([k, v]) => {
      if (typeof v !== "object") {
        text += `- **${k}**: **${v}**\n`;
      }
    });
  }

  if (res.sampleSize) {
    text += `\n*Sample Size: ${fmt(res.sampleSize)} records analyzed from dataset (${res.source})*\n`;
  }

  if (res.chart) {
    text += `\n\`\`\`json chart\n${JSON.stringify(res.chart, null, 2)}\n\`\`\`\n`;
  }

  return text;
}

/**
 * Intelligent Query Router: Executes analytical tools based on question semantics and filter scope
 */
export function executeDatasetQuery(question: string, filter?: FilterObject): string {
  const q = norm(question);

  // Extract ALL crops mentioned in question text
  const extractedCrops: string[] = [];
  for (const c of crops) {
    if (q.includes(norm(c))) {
      extractedCrops.push(c);
    }
  }

  // Extract ALL states mentioned in question text
  const extractedStates: string[] = [];
  if (q.includes("punjab")) extractedStates.push("Punjab");
  if (q.includes("haryana")) extractedStates.push("Haryana");
  if (q.includes("uttar pradesh") || q.includes("up")) extractedStates.push("Uttar Pradesh");

  // Extract district mentioned in question text
  let extractedDistrict: string | null = null;
  for (const d of districts) {
    if (q.includes(norm(d))) {
      extractedDistrict = d;
      break;
    }
  }

  // Extract mandi mentioned in question text
  let extractedMandi: string | null = null;
  for (const m of mandis) {
    if (q.includes(norm(m.name))) {
      extractedMandi = m.name;
      break;
    }
  }

  // Check if query is explicitly asking for ALL CROPS / ALL STATES / ALL MANDIS
  const isAllCropsQuery = q.includes("all crop") || q.includes("all crops") || q.includes("every crop") || q.includes("each crop") || q.includes("crops differently") || q.includes("all commodities");
  const isAllStatesQuery = q.includes("all state") || q.includes("all states") || q.includes("every state");
  const isAllMandisQuery = q.includes("all mandi") || q.includes("all mandis") || q.includes("every mandi");

  const primaryCrop = isAllCropsQuery ? null : (extractedCrops[0] || (filter?.crop !== "All" ? filter?.crop : null));
  const primaryState = isAllStatesQuery ? null : (extractedStates[0] || (filter?.state !== "All" ? filter?.state : null));
  const primaryMandi = isAllMandisQuery ? null : (extractedMandi || (filter?.mandi !== "All" ? filter?.mandi : null));

  const mergedFilter: FilterObject = {
    ...filter,
    crop: primaryCrop,
    state: primaryState,
    district: extractedDistrict || (filter?.district !== "All" ? filter?.district : null),
    mandi: primaryMandi,
  };

  // Check out of scope questions
  const validKeywords = [
    "mandi", "market", "crop", "wheat", "rice", "maize", "cotton", "mustard", "sugarcane",
    "price", "msp", "crash", "arrival", "volume", "qtl", "quintal", "tonne", "rain", "weather",
    "temp", "humidity", "punjab", "haryana", "uttar pradesh", "district", "logistics", "transit",
    "delay", "warehouse", "farmer", "list", "all", "top", "overview", "analytics", "graph", "chart", "compare",
    "best", "sell", "selling", "buy", "where", "how many", "count", "record", "total", "average", "avg", "highest", "lowest", "max", "min"
  ];

  const isAgriRelated = validKeywords.some((k) => q.includes(k)) || 
                        mandis.some((m) => q.includes(norm(m.name)) || q.includes(norm(m.district))) ||
                        warehouses.some((w) => q.includes(norm(w)));

  if (!isAgriRelated) {
    return `I am the MandiGrid Data Analyst, grounded strictly in Indian agricultural dataset metrics.

I don't have enough data in the current dataset/filter scope to calculate that.

Please ask an agricultural analytical question such as:
- *"Which mandi has the highest transit delay?"*
- *"Best mandi to sell rice"*
- *"Which mandi has the highest arrivals?"*
- *"Which crop has the highest price crash rate?"*
- *"Compare Punjab and Haryana"*
- *"What was the highest arrival day?"*
- *"Which warehouse has the highest delay rate?"*`;
  }

  // 1. Price crash / MSP gap (prioritize below MSP queries)
  if (q.includes("crash") || q.includes("below msp") || q.includes("crash rate")) {
    return formatResultToMarkdown(get_price_crashes(mergedFilter));
  }

  // 2. Best mandi to sell / highest price mandi for crop
  if (q.includes("best mandi") || q.includes("where to sell") || q.includes("highest price mandi") || q.includes("best market") || q.includes("top price") || q.includes("best price") || (q.includes("sell") && !q.includes("below"))) {
    return formatResultToMarkdown(get_best_mandi_for_crop(mergedFilter));
  }

  // 3. Warehouse delay (prioritize warehouse over generic transit)
  if (q.includes("warehouse")) {
    return formatResultToMarkdown(get_warehouse_delays(mergedFilter));
  }

  // 4. Mandi transit delay
  if (q.includes("transit") || q.includes("delay") || q.includes("transport") || q.includes("logistics")) {
    return formatResultToMarkdown(get_logistics_analysis(mergedFilter));
  }

  // 5. Crop Comparison (e.g. "compare wheat and sugarcane", "compare rice and mustard")
  if (q.includes("compare") && (extractedCrops.length >= 1 || crops.some((c) => q.includes(norm(c))))) {
    const cropA = extractedCrops[0] || "Wheat";
    const cropB = extractedCrops[1] || (cropA === "Wheat" ? "Rice" : "Wheat");
    const cleanFilter: FilterObject = { ...mergedFilter };
    delete cleanFilter.crop; // Allow comparison across both crops
    return formatResultToMarkdown(compare_crops(cropA, cropB, cleanFilter));
  }

  // 6. State Comparison (e.g. "compare Punjab and UP", "compare Haryana and Punjab")
  if (q.includes("compare") && (extractedStates.length >= 1 || q.includes("state"))) {
    const stateA = extractedStates[0] || "Punjab";
    const stateB = extractedStates[1] || (stateA === "Punjab" ? "Haryana" : "Punjab");
    const cleanFilter: FilterObject = { ...mergedFilter };
    delete cleanFilter.state; // Allow comparison across both states
    return formatResultToMarkdown(compare_states(stateA, stateB, cleanFilter));
  }

  // 7. Generic Comparison
  if (q.includes("compare")) {
    const cropA = extractedCrops[0] || "Wheat";
    const cropB = extractedCrops[1] || (cropA === "Wheat" ? "Rice" : "Wheat");
    const cleanFilter: FilterObject = { ...mergedFilter };
    delete cleanFilter.crop;
    return formatResultToMarkdown(compare_crops(cropA, cropB, cleanFilter));
  }

  // 8. Daily arrivals / Peak date
  if (q.includes("highest arrival day") || q.includes("arrival day") || q.includes("daily arrival") || q.includes("arrivals by day") || q.includes("peak date") || q.includes("march") || q.includes("day")) {
    return formatResultToMarkdown(get_daily_arrivals(mergedFilter));
  }

  // 9. Top mandis by volume
  if (q.includes("top mandi") || q.includes("top mandis") || (q.includes("top") && q.includes("mandi"))) {
    return formatResultToMarkdown(get_mandi_arrivals(mergedFilter));
  }

  // 10. Top crops by volume
  if (q.includes("top crop") || q.includes("top crops") || (q.includes("top") && q.includes("crop"))) {
    return formatResultToMarkdown(get_crop_arrivals(mergedFilter));
  }

  // 11. Rainfall / Weather / Correlation
  if (q.includes("rain") || q.includes("weather") || q.includes("correlation") || q.includes("temp") || q.includes("temperature") || q.includes("humidity") || q.includes("climate")) {
    return formatResultToMarkdown(get_weather_analysis(mergedFilter));
  }

  // 12. State Arrivals
  if (q.includes("state") && (q.includes("arrival") || q.includes("volume") || q.includes("share") || q.includes("breakdown"))) {
    return formatResultToMarkdown(get_state_arrivals(mergedFilter));
  }

  // 13. Mandi arrivals / Volume
  if (q.includes("highest arrival") || q.includes("mandi arrival") || q.includes("arrival volume") || q.includes("arrivals") || q.includes("arrived") || q.includes("volume") || q.includes("qtl") || q.includes("quintal") || q.includes("farmer") || q.includes("farmers")) {
    return formatResultToMarkdown(get_mandi_arrivals(mergedFilter));
  }

  // 14. Price analysis / MSP
  if (q.includes("modal price") || q.includes("average price") || q.includes("price") || q.includes("msp") || q.includes("rate") || q.includes("cost") || q.includes("rupees")) {
    return formatResultToMarkdown(get_price_analysis(mergedFilter));
  }

  // 15. Dataset Overview / Scope / All mandis
  if (q.includes("overview") || q.includes("summary") || q.includes("dataset") || q.includes("directory") || q.includes("all mandis") || q.includes("list mandis") || q.includes("show mandis") || q.includes("how many") || q.includes("total") || q.includes("count") || q.includes("records")) {
    return formatResultToMarkdown(get_dataset_overview());
  }

  // 16. If a crop was explicitly mentioned (e.g. "sugarcane"), return price analysis for that crop
  if (primaryCrop) {
    return formatResultToMarkdown(get_price_analysis(mergedFilter));
  }

  // 17. If a mandi was explicitly mentioned, return mandi arrival analysis
  if (extractedMandi) {
    return formatResultToMarkdown(get_mandi_arrivals(mergedFilter));
  }

  // 18. If a district was explicitly mentioned, return weather analysis for that district
  if (extractedDistrict) {
    return formatResultToMarkdown(get_weather_analysis(mergedFilter));
  }

  // Strict refusal when query intent cannot be computed — NEVER return generic fallback or invented text
  return "I couldn't calculate that from the current dataset scope. Please ask a specific agricultural question about prices, arrivals, price crashes, weather, or logistics.";
}
