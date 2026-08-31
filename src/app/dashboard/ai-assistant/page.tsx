"use client";

import { useState } from "react";
import { useFilterStore } from "@/store/useFilterStore";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistantPage() {
  const { division, year, currency } = useFilterStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          filter_context: { division, year, currency },
          session_id: sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "unknown"}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="min-h-[300px] space-y-3 rounded-lg border border-border bg-surface p-4">
        {messages.length === 0 && (
          <p className="text-xs text-muted">
            Ask about the current scope (division: {division}, year: {year}) — e.g. &quot;What&apos;s our ROI this year?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                m.role === "user" ? "bg-teal text-bg" : "bg-bg3 text-text"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-xs text-muted">Thinking...</p>}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about P&L, ROI, cost structure..."
          className="flex-1 rounded-md border border-border bg-bg3 px-3 py-2 text-xs text-text outline-none focus:border-teal"
        />
        <button type="submit" disabled={loading} className="rounded-md bg-teal px-4 py-2 text-xs font-semibold text-bg disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
