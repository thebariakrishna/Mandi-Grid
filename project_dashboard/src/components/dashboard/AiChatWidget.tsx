import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AiChartRenderer, type ChartConfig } from "./AiChartRenderer";
import { askAiQuestion } from "@/lib/ai";

import { useFilters } from "@/lib/filters";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chart?: ChartConfig;
};

const DEFAULT_WELCOME: Message = {
  id: "1",
  role: "assistant",
  content: "Hi! I am the MandiGrid Data-Grounded Assistant. Ask me analytical questions about Mandi arrivals, wholesale prices, MSP crash rates, logistics delays, or weather impact!"
};

// Simple parser to extract JSON chart configurations from markdown
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

export function AiChatWidget() {
  const { state, crop, days } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
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
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mandigrid_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleClearChat = () => {
    setMessages([DEFAULT_WELCOME]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("mandigrid_chat_history");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageCircle size={24} />
      </button>

      <div
        className={`fixed bottom-6 right-6 z-50 w-80 md:w-[400px] h-[550px] max-h-[80vh] flex flex-col bg-background border border-border rounded-2xl shadow-2xl transition-all origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">AI</div>
            <div>
              <h3 className="font-display font-bold text-sm">MandiGrid Assistant</h3>
              <p className="text-[10px] text-muted-foreground">Session Saved</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClearChat} title="Clear session chat" className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={16} />
            </button>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-br-none" 
                    : "bg-surface border border-border text-foreground rounded-bl-none"
                }`}
              >
                {m.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {m.chart && <AiChartRenderer config={m.chart} />}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-bl-none px-4 py-3">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="p-3 border-t border-border bg-surface rounded-b-2xl">
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
              placeholder="Ask about crops, prices, mandis..."
              className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
