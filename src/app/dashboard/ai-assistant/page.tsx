"use client";

import { useState, useRef, useEffect } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { useUiStore } from "@/store/useUiStore";
import { useFxLive } from "@/hooks/useFxRates";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
}

const QUICK_QUESTIONS = [
  { icon: "📋", label: "P&L Summary", prompt: "Summarize the P&L performance for the current filter selection" },
  { icon: "📈", label: "ROI vs Benchmarks", prompt: "What is the ROI trend and how does it compare to benchmarks?" },
  { icon: "💱", label: "NVC in IDR", prompt: "What is Net Value Creation for the current scope in IDR?" },
  { icon: "🏆", label: "Best Period", prompt: "Which period had the best performance and why?" },
  { icon: "💸", label: "Spending Gap", prompt: "Explain the gap between Actual vs Target spending" },
  { icon: "⚠️", label: "Key Risks", prompt: "What are the key risks I should be aware of in this scope?" },
];

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME =
  "👋 Hello! I'm your Procurement Analytics AI with access to your uploaded P&L data: P&L by division (SMM, SUN, OliveLink, Combine) · BI JISDOR quarterly rates for USD↔IDR · ROI, NVC, Value Creation, Cost & Spending analysis · 15-component cost breakdown per period · Revenue & GP benchmarking. Ask me anything about the current filter scope.";

export default function AiAssistantPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: live } = useFxLive();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const consumedPrompt = useRef(false);
  const pendingAiPrompt = useUiStore((s) => s.pendingAiPrompt);
  const setPendingAiPrompt = useUiStore((s) => s.setPendingAiPrompt);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // "Ask AI to Elaborate" buttons elsewhere in the dashboard stash a prompt here, then
  // route to this page — pick it up once on mount and clear it so it doesn't resend.
  // The ref guard (rather than relying on setPendingAiPrompt(null) alone) is what makes
  // this safe under React StrictMode's dev-only double-invoke of mount effects, where
  // both invocations would otherwise still see the same pre-clear store value.
  useEffect(() => {
    if (pendingAiPrompt && !consumedPrompt.current) {
      consumedPrompt.current = true;
      const prompt = pendingAiPrompt;
      setPendingAiPrompt(null);
      send(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text, time: nowLabel() }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          filter_context: { division, year, quarter, currency },
          session_id: sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply, time: nowLabel() }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "unknown"}`, time: nowLabel() }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-260px)] min-h-[460px] grid-cols-1 gap-3.5 lg:grid-cols-[1fr_280px]">
      <div data-ui="card" className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg2">
        <div className="flex items-center gap-2.5 border-b border-border bg-teal/[0.04] px-4 py-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-teal to-[#0088aa] text-sm">🤖</div>
          <div>
            <p className="text-xs font-semibold text-text">Procurement AI Assistant</p>
            <p className="text-[10px] text-muted">Anthropic Claude · Full P&amp;L + BI FX data</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-3">
          <Bubble role="assistant" text={WELCOME} time="Ready" />
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.content} time={m.time} />
          ))}
          {loading && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-bg3 px-3 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal" />
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-1.5 border-t border-border p-2.5"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about P&L, ROI, IDR impact, benchmarks…"
            rows={1}
            className="max-h-[100px] min-h-[36px] flex-1 resize-none rounded-lg border border-border bg-bg3 px-3 py-2 text-xs text-text outline-none focus:border-teal/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-md bg-teal text-bg transition hover:bg-[#00a8c4] disabled:cursor-not-allowed disabled:bg-surface"
          >
            ➤
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-2.5">
        <div data-ui="card" className="rounded-xl border border-border bg-bg2 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Quick Questions</p>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q.label}
              onClick={() => send(q.prompt)}
              className="mb-1.5 w-full rounded-md border border-border bg-bg3 px-2.5 py-2 text-left text-[11px] leading-snug text-light transition hover:border-teal/30 hover:bg-teal/[0.05] hover:text-teal"
            >
              {q.icon} {q.label}
            </button>
          ))}
        </div>
        <div data-ui="card" className="rounded-xl border border-border bg-bg2 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Live Snapshot</p>
          <SnapshotRow label="BI Live Rate" value={live ? `Rp${live.rate.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "…"} />
          <SnapshotRow label="Division" value={division} />
          <SnapshotRow label="Year / Period" value={`${year} / ${quarter}`} />
          <SnapshotRow label="Currency" value={currency === "USD" ? "USD Mn" : "IDR Bn"} />
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, text, time }: { role: "user" | "assistant"; text: string; time: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed ${
          isUser ? "border border-teal/25 bg-teal/[0.15] text-text" : "border border-border bg-bg3 text-text"
        }`}
      >
        {text}
      </div>
      <div className={`text-[10px] text-muted ${isUser ? "text-right" : ""}`}>{time}</div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 text-[11px] last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-text">{value}</span>
    </div>
  );
}
