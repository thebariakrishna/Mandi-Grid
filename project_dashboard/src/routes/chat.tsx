import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, BarChart2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Shell, Panel } from "@/components/dashboard/Shell";
import { AiChartRenderer, type ChartConfig } from "@/components/dashboard/AiChartRenderer";
import { askAiQuestion } from "@/lib/ai";
import { useFilters } from "@/lib/filters";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Assistant — MandiGrid" },
      {
        name: "description",
        content: "Ask AI about Mandi arrivals, prices, MSP, weather impact and logistics.",
      },
    ],
  }),
  component: ChatPage,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chart?: ChartConfig;
};

const DEFAULT_WELCOME: Message = {
  id: "1",
  role: "assistant",
  content: "Hello! I am the MandiGrid AI Assistant. Ask me anything about crop prices, MSP, mandis, or weather trends across India. I can also generate visual charts for you!"
};

function parseMessageContent(text: string): { cleanText: string; chart?: ChartConfig } {
  const chartRegex = /```json chart\n([\s\S]*?)\n```/;
  const match = text.match(chartRegex);
  
  if (match && match[1]) {
    try {
      const chart = JSON.parse(match[1]) as ChartConfig;
      const cleanText = text.replace(chartRegex, "").trim();
      return { cleanText, chart };
    } catch (e) {
      console.error("Failed to parse chart JSON", e);
    }
  }
  
  return { cleanText: text };
}

function ChatPage() {
  const { state, crop, days } = useFilters();
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("mandigrid_chat_history");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [DEFAULT_WELCOME];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mandigrid_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClearChat = () => {
    setMessages([DEFAULT_WELCOME]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("mandigrid_chat_history");
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setIsLoading(true);

    try {
      const contextFilter = {
        state: state === "All" ? null : state,
        crop: crop === "All" ? null : crop,
        days: days || null,
      };

      const responseText = await askAiQuestion({ data: { question: userMsg.content, context: contextFilter } });
      const parsed = parseMessageContent(responseText);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: parsed.cleanText,
        ...(parsed.chart ? { chart: parsed.chart } : {}),
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I encountered an error processing your question." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    "Which mandi has the highest transit delay?",
    "Which mandi has the highest arrivals?",
    "Which crop has the highest price crash rate?",
    "Compare Punjab and Haryana",
    "What was the highest arrival day?",
    "Which warehouse has the highest delay rate?",
    "What is the rainfall correlation with arrivals?",
    "Show Wheat arrivals in Punjab"
  ];

  return (
    <Shell title="AI Assistant" subtitle="Ask questions & generate interactive charts for Mandi data">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[600px]">
        {/* Main Chat Area */}
        <div className="lg:col-span-3 flex flex-col rounded-xl border border-border bg-surface overflow-hidden h-[650px]">
          {/* Header */}
          <div className="p-4 border-b border-border bg-background flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm">MandiGrid Intelligence Bot</h3>
                <p className="text-[11px] text-muted-foreground">Session Saved Until Closed</p>
              </div>
            </div>
            <button
              onClick={handleClearChat}
              title="Clear Session History"
              className="p-2 text-xs flex items-center gap-1.5 rounded-lg border border-border bg-surface text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            >
              <Trash2 size={14} />
              <span>Clear Session</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[80%] space-y-2`}>
                  <div className={`rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-surface border border-border text-foreground rounded-tl-none"}`}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                  {m.chart && <AiChartRenderer config={m.chart} />}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-surface border border-border rounded-2xl px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Mandi prices, arrivals, or request a chart..."
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Suggestions */}
        <div className="space-y-4">
          <Panel title="Suggested Prompts" hint="Click to ask">
            <div className="space-y-2">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleSend(q);
                  }}
                  className="w-full text-left p-2.5 text-xs rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-start gap-2 text-muted-foreground hover:text-foreground"
                >
                  <BarChart2 size={14} className="shrink-0 mt-0.5 text-primary" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Dataset Coverage" hint="MandiGrid Scope">
            <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
              <li>57 Mandis across Punjab, Haryana, UP</li>
              <li>24,525 Crop Arrival Records</li>
              <li>10,765 Price & MSP Gap Records</li>
              <li>13,445 Weather & Rainfall Records</li>
              <li>Session auto-saved until browser closed</li>
            </ul>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
