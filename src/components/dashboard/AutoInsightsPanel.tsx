"use client";

import { useRouter } from "next/navigation";
import { useUiStore } from "@/store/useUiStore";
import type { AvtInsights } from "@/lib/avt-insights";

export function AutoInsightsPanel({ title, insights, askPrompt }: { title: string; insights: AvtInsights; askPrompt: string }) {
  const router = useRouter();
  const setPendingAiPrompt = useUiStore((s) => s.setPendingAiPrompt);

  return (
    <div className="mb-3.5 rounded-xl border border-teal/20 bg-gradient-to-br from-teal/[0.06] to-gold/[0.03] p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-teal">💡 {title}</span>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-muted">
            {insights.periodRange} ({insights.periodCount} periods)
          </span>
          <button
            onClick={() => {
              setPendingAiPrompt(askPrompt);
              router.push("/dashboard/ai-assistant");
            }}
            className="whitespace-nowrap rounded-md bg-gradient-to-br from-teal to-[#0891b2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.03em] text-bg transition hover:brightness-110"
          >
            💬 Ask AI to Elaborate
          </button>
        </div>
      </div>
      <p className="mb-2.5 rounded-r-md border-l-[3px] border-gold bg-gold/[0.08] px-3 py-2 text-[13px] font-semibold text-text">{insights.headline}</p>
      <ul className="flex flex-col gap-1.5">
        {insights.bullets.map((b, i) => (
          <li key={i} className="relative pl-3.5 text-[12px] leading-relaxed text-light before:absolute before:left-0 before:text-gold before:content-['▸']">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
