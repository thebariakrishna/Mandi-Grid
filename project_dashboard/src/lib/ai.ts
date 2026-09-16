import { createServerFn } from "@tanstack/react-start";
import {
  executeDatasetQuery,
  formatResultToMarkdown,
  get_dataset_overview,
  get_arrival_summary,
  get_daily_arrivals,
  get_mandi_arrivals,
  get_crop_arrivals,
  get_state_arrivals,
  get_price_analysis,
  get_price_crashes,
  get_logistics_analysis,
  get_warehouse_delays,
  get_weather_analysis,
  compare_states,
  compare_crops,
  get_top_mandis,
  get_top_crops,
  get_top_warehouses,
  type FilterObject,
  type StructuredResult,
} from "./analytics";

export type AskAiPayload = {
  question: string;
  context?: FilterObject;
};

const SYSTEM_PROMPT = `You are the MandiGrid Data Analyst.

You are an explanation layer over a verified agricultural dataset.
The dataset calculations supplied to you by application tools are the source of truth.

GOLDEN RULES:
1. NEVER invent numerical values or estimate numbers.
2. NEVER perform raw dataset calculations yourself; rely on tool calculations.
3. NEVER claim correlation is causation. Say "X is correlated with Y", NOT "X caused Y".
4. Price crash is strictly defined as modal_price < MSP.
5. Delay rate = (delayed records / total records) * 100. Delay count = number of delayed records. Never confuse count and rate.
6. For "why" questions, state observed associations and clarify that dataset does not prove causality.
7. Output responses using this structured format:

### Result
[Direct concise answer]

### Evidence
- **Metric**: [Metric name]
- **Value**: [Calculated value with unit]
- **Records Analyzed**: [Sample size]
- **Dataset**: [Source dataset name]

### Scope
- **State**: [Active state filter]
- **District**: [Active district filter]
- **Mandi**: [Active mandi filter]
- **Crop**: [Active crop filter]

### Interpretation
[Short explanation based strictly on calculated evidence]

When generating responses that include chart data, output an embedded json block with language identifier "json chart" formatted exactly like:
\`\`\`json chart
{
  "chartType": "bar",
  "title": "Title",
  "unit": "unit",
  "data": [{"name": "Item", "value": 100}],
  "xAxis": "name",
  "yAxis": "value"
}
\`\`\`
`;

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_best_mandi_for_crop",
      description: "Find the best mandi/market to sell a crop based on highest wholesale modal prices, MSP benchmarks, and MSP price gaps.",
      parameters: {
        type: "object",
        properties: {
          crop: { type: "string" },
          state: { type: "string" },
          district: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_logistics_analysis",
      description: "Calculate mandi transit hours, shipment delays, and transit delay rankings from agricultural transport logs.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          district: { type: "string" },
          mandi: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_warehouse_delays",
      description: "Calculate destination warehouse shipment delay rates and average transit times.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          district: { type: "string" },
          mandi: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_price_crashes",
      description: "Calculate price crash rates (% instances where modal price falls below government MSP) by crop and mandi.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          district: { type: "string" },
          mandi: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mandi_arrivals",
      description: "Calculate total arrival volume in quintals per mandi and find top mandis by arrivals.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          district: { type: "string" },
          mandi: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_crop_arrivals",
      description: "Calculate arrival volume in quintals grouped by crop type.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_state_arrivals",
      description: "Calculate arrival volume in quintals grouped by state (Punjab, Haryana, Uttar Pradesh).",
      parameters: {
        type: "object",
        properties: {
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_arrivals",
      description: "Calculate daily arrival totals and identify peak arrival dates.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_arrival_summary",
      description: "Summary of total arrival volume, record count, and total farmer count.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          district: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_price_analysis",
      description: "Calculate average modal wholesale prices, MSP benchmarks, and MSP price gaps.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          mandi: { type: "string" },
          crop: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather_analysis",
      description: "Calculate maximum district rainfall, average temperature, and rainfall-arrival correlation.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string" },
          district: { type: "string" },
          mandi: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_states",
      description: "Compare total arrivals, prices, crash rates, and delays side-by-side between two states.",
      parameters: {
        type: "object",
        properties: {
          stateA: { type: "string" },
          stateB: { type: "string" },
        },
        required: ["stateA", "stateB"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_crops",
      description: "Compare arrival volumes, modal prices, MSP, and crash rates between two crop commodities.",
      parameters: {
        type: "object",
        properties: {
          cropA: { type: "string" },
          cropB: { type: "string" },
        },
        required: ["cropA", "cropB"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dataset_overview",
      description: "Get general MandiGrid agricultural dataset scope overview, total mandis, and row counts.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

/** Execute local tool by name */
function executeLocalTool(name: string, args: Record<string, any>, contextFilter?: FilterObject): StructuredResult {
  const mergedFilter: FilterObject = { ...contextFilter, ...args };
  
  switch (name) {
    case "get_best_mandi_for_crop":
      return get_best_mandi_for_crop(mergedFilter);
    case "get_logistics_analysis":
      return get_logistics_analysis(mergedFilter);
    case "get_warehouse_delays":
      return get_warehouse_delays(mergedFilter);
    case "get_price_crashes":
      return get_price_crashes(mergedFilter);
    case "get_mandi_arrivals":
      return get_mandi_arrivals(mergedFilter);
    case "get_crop_arrivals":
      return get_crop_arrivals(mergedFilter);
    case "get_state_arrivals":
      return get_state_arrivals(mergedFilter);
    case "get_daily_arrivals":
      return get_daily_arrivals(mergedFilter);
    case "get_arrival_summary":
      return get_arrival_summary(mergedFilter);
    case "get_price_analysis":
      return get_price_analysis(mergedFilter);
    case "get_weather_analysis":
      return get_weather_analysis(mergedFilter);
    case "compare_states":
      return compare_states((args as any).stateA || "Punjab", (args as any).stateB || "Haryana", mergedFilter);
    case "compare_crops":
      return compare_crops((args as any).cropA || "Wheat", (args as any).cropB || "Rice", mergedFilter);
    case "get_top_mandis":
      return get_top_mandis(5, mergedFilter);
    case "get_top_crops":
      return get_top_crops(5, mergedFilter);
    case "get_top_warehouses":
      return get_top_warehouses(5, mergedFilter);
    case "get_dataset_overview":
    default:
      return get_dataset_overview();
  }
}

export const askAiQuestion = createServerFn({ method: "POST" })
  .validator((data: AskAiPayload) => data)
  .handler(async ({ data }) => {
    const question = data.question;
    const filterContext = data.context || {};

    const openrouterKey = process.env["OPENROUTER_API_KEY"];
    const xaiKey = process.env["XAI_API_KEY"];

    const apiKey = openrouterKey || xaiKey;
    const isOpenRouter = Boolean(openrouterKey);
    const endpoint = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.x.ai/v1/chat/completions";
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "grok-2-latest";

    if (apiKey) {
      try {
        console.log(`[AI Query API: ${isOpenRouter ? "OpenRouter" : "xAI"}] "${question}" | Scope:`, filterContext);

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

        if (isOpenRouter) {
          headers["HTTP-Referer"] = "http://localhost:3000";
          headers["X-Title"] = "MandiGrid Agritech Dashboard";
        }

        // 1. First completion call with function tools registered
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Question: "${question}"\nCURRENT DASHBOARD CONTEXT: ${JSON.stringify(filterContext)}`,
              },
            ],
            tools: AI_TOOLS,
            tool_choice: "auto",
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          const choice = resData.choices[0];

          if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
            const toolCall = choice.message.tool_calls[0];
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

            console.log(`[AI Tool Call] Executing ${fnName} with args:`, fnArgs);

            // Execute local analytical tool against local JSON dataset
            const toolResult = executeLocalTool(fnName, fnArgs, filterContext);

            if (process.env["NODE_ENV"] !== "production") {
              console.log(`
==================================================
DEVELOPER ANALYTICS TRACE
==================================================
USER QUESTION:           "${question}"
SELECTED ANALYTICS TOOL: ${fnName}
TOOL ARGUMENTS:          ${JSON.stringify(fnArgs)}
ACTIVE FILTERS:          ${JSON.stringify(filterContext)}
SAMPLE SIZE ANALYZED:    ${toolResult.sampleSize} records
CALCULATED RESULT:       ${JSON.stringify(toolResult.result, null, 2)}
==================================================
`);
            }

            const markdownResult = formatResultToMarkdown(toolResult);

            // Send tool result back to LLM for natural language explanation
            const secondResponse = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify({
                model,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  {
                    role: "user",
                    content: `Question: "${question}"\nCURRENT DASHBOARD CONTEXT: ${JSON.stringify(filterContext)}`,
                  },
                  choice.message,
                  {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: `CALCULATED DATASET METRICS:\n${JSON.stringify(toolResult, null, 2)}\n\nFORMATTED DATASET SUMMARY (Preserve exact numbers, charts, and metrics):\n${markdownResult}`,
                  },
                ],
              }),
            });

            if (secondResponse.ok) {
              const secondData = await secondResponse.json();
              const finalContent = secondData.choices[0]?.message?.content;
              if (finalContent) return finalContent;
            }

            // Fallback to formatted markdown tool result if 2nd call fails
            return markdownResult;
          }
        }
      } catch (e) {
        console.warn("AI API call failed or error encountered, using local analytical engine:", e);
      }
    }

    // 2. Local Programmatic Analytics Engine (100% data-grounded, zero hallucination)
    console.log(`[Local Analytics Engine] Query: "${question}"`);
    return executeDatasetQuery(question, filterContext);
  });
