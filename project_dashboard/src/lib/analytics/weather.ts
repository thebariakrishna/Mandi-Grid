import weather from "../../../public/data/weather.json" with { type: "json" };
import arrivals from "../../../public/data/arrivals.json" with { type: "json" };
import { districts, mandis, matchDistrictFilter, matchDateFilter } from "./filters";
import { calculateCorrelation, fmt } from "./definitions";
import type { FilterObject, StructuredResult } from "./types";

const weatherRows = weather as Array<[string, number, number | null, number | null, number | null]>;
const arrivalRows = arrivals as Array<[string, number, number, number, number]>;

let maxDateStr = "";
for (const r of weatherRows) {
  if (r[0] > maxDateStr) maxDateStr = r[0];
}

export function get_weather_analysis(filter?: FilterObject): StructuredResult {
  const filteredWeather = weatherRows.filter(
    (r) => matchDistrictFilter(r[1], filter) && matchDateFilter(r[0], filter, maxDateStr) && r[2] !== null
  );

  if (filteredWeather.length === 0) {
    return {
      success: false,
      questionType: "weather_analysis",
      metric: "rainfall_mm",
      title: "Weather & Climate Analysis",
      scope: filter || {},
      result: { message: "No weather records match the selected filter scope." },
      sampleSize: 0,
      source: "weather_sensors",
    };
  }

  const rainVals = filteredWeather.map((w) => w[2]!).filter((v) => v >= 0);
  const tempVals = filteredWeather.map((w) => w[3]).filter((v): v is number => v !== null);

  const maxRain = rainVals.length > 0 ? Math.max(...rainVals) : 0;
  const avgRain = rainVals.length > 0 ? Number((rainVals.reduce((a, b) => a + b, 0) / rainVals.length).toFixed(1)) : 0;
  const avgTemp = tempVals.length > 0 ? Number((tempVals.reduce((a, b) => a + b, 0) / tempVals.length).toFixed(1)) : 0;

  // Group max rainfall by district
  const districtRain: Record<number, { max: number; sum: number; count: number }> = {};
  filteredWeather.forEach((w) => {
    const dIdx = w[1];
    const rVal = w[2]!;
    if (!districtRain[dIdx]) districtRain[dIdx] = { max: 0, sum: 0, count: 0 };
    districtRain[dIdx].sum += rVal;
    districtRain[dIdx].count++;
    if (rVal > districtRain[dIdx].max) districtRain[dIdx].max = rVal;
  });

  const districtRankings = Object.keys(districtRain)
    .map((dIdxStr) => {
      const idx = Number(dIdxStr);
      const item = districtRain[idx]!;
      return {
        district: districts[idx] || `District ${idx}`,
        maxRainfallMm: Number(item.max.toFixed(1)),
        avgRainfallMm: Number((item.sum / item.count).toFixed(1)),
      };
    })
    .sort((a, b) => b.maxRainfallMm - a.maxRainfallMm);

  // Calculate Pearson correlation between daily rainfall & daily arrivals
  const dailyWeatherSum: Record<string, number> = {};
  filteredWeather.forEach((w) => {
    dailyWeatherSum[w[0]] = (dailyWeatherSum[w[0]] || 0) + w[2]!;
  });

  const dailyArrivalSum: Record<string, number> = {};
  arrivalRows.forEach((a) => {
    dailyArrivalSum[a[0]] = (dailyArrivalSum[a[0]] || 0) + a[3];
  });

  const commonDates = Object.keys(dailyWeatherSum).filter((d) => dailyArrivalSum[d] !== undefined);
  const rainSeries: number[] = commonDates.map((d) => dailyWeatherSum[d]!).filter((v) => v !== undefined);
  const arrivalSeries: number[] = commonDates.map((d) => dailyArrivalSum[d]!).filter((v) => v !== undefined);

  const { r: corrR, interpretation: corrMeaning } = calculateCorrelation(rainSeries, arrivalSeries);

  return {
    success: true,
    questionType: "weather_analysis",
    metric: "rainfall_correlation",
    title: "Weather & Rainfall Correlation Analysis",
    scope: filter || {},
    result: {
      maxRecordedRainfallMm: maxRain,
      highestRainfallDistrict: districtRankings[0]?.district || "None",
      avgDailyRainfallMm: avgRain,
      avgTemperatureCelsius: avgTemp,
      rainfallArrivalCorrelationR: corrR,
      correlationInterpretation: corrMeaning,
      totalWeatherRecords: filteredWeather.length,
      topDistrictsByRainfall: districtRankings.slice(0, 5),
    },
    sampleSize: filteredWeather.length,
    unit: "mm",
    source: "weather_sensors",
    calculationNote: `Pearson correlation (r = ${corrR}) calculated across ${commonDates.length} matching daily weather and mandi arrival points`,
    chart: {
      chartType: "bar",
      title: "Maximum Recorded Rainfall by District (mm)",
      unit: "mm",
      data: districtRankings.slice(0, 8).map((d) => ({ name: d.district, value: d.maxRainfallMm })),
      xAxis: "name",
      yAxis: "value",
    },
  };
}
