import type { GenericChartSpec } from "@/charts/GenericChartRenderer";
import type { FilterState } from "@/components/layout/FilterContext";

export interface AskResult {
  answer: string;
  insights?: string[];
  chart?: GenericChartSpec;
  data_source?: string;
}

export const exampleQueries = [
  "Which crop has the highest total arrivals?",
  "Show the top 5 mandis by arrivals.",
  "Which crops have the highest below-MSP rate?",
  "Compare Wheat and Rice against MSP.",
  "Which warehouse has the highest delay rate?",
  "Show rainfall versus arrivals.",
  "Show Wheat arrivals over time."
];

export async function runIntent(
  query: string, 
  filters: FilterState, 
  history: {role: string, content: string}[] = []
): Promise<AskResult> {
  const trimmed = query.trim();
  if (!trimmed) return { answer: "" };

  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const res = await fetch(`${API_URL}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: trimmed,
        history,
        filters: {
          state: filters.state === "All" ? null : filters.state,
          crop: filters.crop === "All" ? null : filters.crop,
          time_window: filters.window === "All" ? null : filters.window,
        },
      }),
    });

    if (!res.ok) {
      throw new Error("Backend error");
    }

    const data = await res.json();
    return {
      answer: data.answer,
      insights: data.insights,
      chart: data.chart ? data.chart : undefined,
      data_source: data.data_source,
    };
  } catch (err) {
    return { answer: "I couldn't connect to the MandiGrid AI backend right now." };
  }
}
