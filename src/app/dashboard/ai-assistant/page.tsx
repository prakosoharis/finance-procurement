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
  { icon: "💱", label: "FY25 NVC in IDR", prompt: "What is FY 2025 Net Value Creation in IDR?" },
  { icon: "🏆", label: "Best Period", prompt: "Which period had the best performance and why?" },
  { icon: "💸", label: "Spending Gap", prompt: "Explain the gap between Actual vs Target spending" },
  { icon: "⚠️", label: "FY 2026 Risks", prompt: "What are the key risks for FY 2026?" },
];

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const WELCOME = [
  "👋 Hello! I'm your Procurement Analytics AI with access to your uploaded P&L data:",
  "",
  "• **P&L data** by division (SMM, SUN, OliveLink, Combine)",
  "• **BI JISDOR quarterly rates** for USD↔IDR",
  "• **ROI, NVC, Value Creation, Cost & Spending** analysis",
  "• **15-component cost breakdown** per period",
  "• **Revenue & GP benchmarking**",
  "",
  "Ask me anything about the current filter scope.",
].join("\n");

export default function AiAssistantPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: live } = useFxLive();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  function autoGrow() {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "36px";
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: text, time: nowLabel() }];
    setMessages(next);
    setInput("");
    requestAnimationFrame(autoGrow);
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
    <div className="grid h-[calc(100vh-220px)] min-h-[460px] grid-cols-1 gap-3.5 lg:grid-cols-[1fr_280px]">
      <div data-ui="card" className="flex flex-col overflow-hidden rounded-xl border border-border bg-bg2">
        <div className="flex items-center gap-2.5 border-b border-border bg-teal/[0.04] px-[15px] py-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-teal to-[#0088aa] text-sm">🤖</div>
          <div>
            <p className="text-[13px] font-semibold text-text">Procurement AI Assistant</p>
            <p className="text-[10px] text-muted">Powered by Claude · Full P&amp;L + BI FX data</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
          <Bubble role="assistant" text={WELCOME} time="Ready" />
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.content} time={m.time} />
          ))}
          {loading && (
            <div className="flex max-w-[85%] flex-col gap-[3px] self-start">
              <div className="rounded-[10px] border border-border bg-bg3 px-3 py-[9px]">
                <div className="flex items-center gap-1">
                  <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-teal" />
                  <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-teal [animation-delay:.15s]" />
                  <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-teal [animation-delay:.3s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-[7px] border-t border-border px-[13px] py-[11px]"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about P&L, ROI, IDR impact, benchmarks…"
            rows={1}
            className="max-h-[100px] min-h-[36px] flex-1 resize-none rounded-lg border border-border bg-bg3 px-3 py-[9px] text-xs leading-normal text-text outline-none transition-colors focus:border-teal/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[7px] bg-teal transition hover:bg-[#00a8c4] disabled:cursor-not-allowed disabled:bg-surface"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#0b0f15]">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
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
              className="mb-[5px] w-full rounded-md border border-border bg-bg3 px-[11px] py-2 text-left text-[11px] leading-[1.4] text-light transition hover:border-teal/30 hover:bg-teal/[0.05] hover:text-teal"
            >
              {q.icon} {q.label}
            </button>
          ))}
        </div>
        <div data-ui="card" className="rounded-xl border border-border bg-bg2 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Live Snapshot</p>
          <div className="flex flex-col gap-[5px] text-[11px] text-muted">
            <SnapshotRow label="BI Live Rate" value={live ? `Rp${live.rate.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "…"} className="text-teal" />
            <SnapshotRow label="Division" value={division} className="text-light" />
            <SnapshotRow label="Currency" value={currency === "USD" ? "USD Mn" : "IDR Bn"} className="font-semibold text-[#60a5fa]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The assistant answers in light markdown (**bold**, bullets, line breaks) — both the
 * Claude replies and the offline fallback — so render those rather than showing the
 * literal asterisks, matching the reference dashboard's addMsg() formatting.
 */
function renderMarkdown(text: string) {
  return text.split("\n").map((line, li) => (
    <span key={li}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={pi}>{part.slice(2, -2)}</strong> : <span key={pi}>{part}</span>
      )}
      {li < text.split("\n").length - 1 && <br />}
    </span>
  ));
}

function Bubble({ role, text, time }: { role: "user" | "assistant"; text: string; time: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex max-w-[85%] flex-col gap-[3px] ${isUser ? "self-end" : "self-start"}`}>
      <div
        className={`rounded-[10px] px-3 py-[9px] text-xs leading-[1.6] ${
          isUser ? "border border-teal/25 bg-teal/[0.15] text-text" : "border border-border bg-bg3 text-text"
        }`}
      >
        {renderMarkdown(text)}
      </div>
      <div className={`text-[10px] text-muted ${isUser ? "text-right" : ""}`}>{time}</div>
    </div>
  );
}

function SnapshotRow({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
