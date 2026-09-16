import { useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Primitives";
import { runIntent, exampleQueries, type AskResult } from "@/utils/intentEngine";
import { GenericChartRenderer } from "@/charts/GenericChartRenderer";
import { useGlobalFilters } from "@/components/layout/FilterContext";

interface Exchange {
  id: number;
  query: string;
  result: AskResult | null;
  pending: boolean;
}

let nextId = 1;

export default function AskMandiGrid() {
  // Plain, uncontrolled-feeling text state — updated on every keystroke, but
  // that update is just a string set, never a dataset load or calculation.
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const submittingRef = useRef(false);
  const { filters } = useGlobalFilters();

  const submit = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || submittingRef.current) return;
    submittingRef.current = true;

    const id = nextId++;
    
    // Build history from previous exchanges (newest first in state, so we reverse it for API)
    setExchanges((prev) => {
      const history = [...prev]
        .filter(ex => ex.result)
        .reverse()
        .flatMap(ex => [
          { role: "user", content: ex.query },
          { role: "assistant", content: ex.result?.answer || "" }
        ]);

      runIntent(trimmed, filters, history).then((result) => {
        setExchanges((latest) => latest.map((ex) => (ex.id === id ? { ...ex, result, pending: false } : ex)));
        submittingRef.current = false;
      });

      return [{ id, query: trimmed, result: null, pending: true }, ...prev];
    });
    setInput("");
  }, [filters]);

  return (
    <div>
      <PageHeader
        title="Ask MandiGrid"
        subtitle="Ask questions about MandiGrid data. Get answers, interactive charts, and evidence-based insights."
        showFilters={false}
      />

      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Which mandi has the highest arrivals?"
            className="flex-1 rounded-sm border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-grain-green"
          />
          <button
            type="submit"
            className="shrink-0 rounded-sm bg-grain-green px-4 py-2 text-sm font-medium text-white hover:bg-grain-greenDark"
          >
            Ask
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {exampleQueries.map((q) => (
            <button
              key={q}
              onClick={() => submit(q)}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-grain-green hover:text-grain-greenDark"
            >
              {q}
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-6 space-y-4">
        {exchanges.length === 0 && (
          <p className="text-sm text-ink-faint">Ask a question above, or tap one of the examples to get started.</p>
        )}
        {exchanges.map((ex) => (
          <Panel key={ex.id}>
            <p className="text-[13px] font-medium text-ink-soft">{ex.query}</p>
            {ex.pending ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-grain-green border-t-transparent" />
                Calculating…
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink">{ex.result?.answer}</p>
                {ex.result?.chart && (
                  <div className="mt-4 border border-line p-4 rounded-sm">
                    <GenericChartRenderer spec={ex.result.chart} />
                  </div>
                )}
                {ex.result?.insights && ex.result.insights.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">Key Insights</p>
                    <ul className="list-disc pl-5 space-y-1 text-[13px] text-ink-soft">
                      {ex.result.insights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ex.result?.data_source && (
                  <p className="mt-4 text-[11px] uppercase text-ink-faint tracking-wider">
                    Source: {ex.result.data_source}
                  </p>
                )}
              </>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
