"use client";

import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { buildInsights } from "@/lib/insights";
import type { PnlRow } from "@/types";

const TONE_DOT: Record<string, string> = {
  good: "before:content-['•'] before:text-green",
  warn: "before:content-['•'] before:text-gold",
  bad: "before:content-['•'] before:text-red",
  neutral: "before:content-['•'] before:text-teal",
};

export default function InsightsPage() {
  const { division, year, quarter } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });

  // When scope is "Combine", also fetch the per-division breakdown so insights can call
  // out which division contributes most — the store never sends division="All" itself.
  const { data: allDivisionRows } = useQuery({
    queryKey: ["pnl-all-divisions", year, quarter],
    queryFn: async () => {
      const res = await fetch(`/api/pnl?division=All&year=${year}&quarter=${quarter}`);
      if (!res.ok) throw new Error("Failed to load division breakdown");
      return res.json() as Promise<PnlRow[]>;
    },
    enabled: division === "Combine",
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <p className="text-sm text-muted">Loading insights...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (!rows || rows.length === 0) return <p className="text-sm text-muted">No data for this scope yet.</p>;

  const insights = buildInsights(division === "Combine" && allDivisionRows ? allDivisionRows : rows);

  const good = insights.filter((i) => i.tone === "good" || i.tone === "neutral");
  const watch = insights.filter((i) => i.tone === "warn" || i.tone === "bad");

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-bg2 p-4">
        <h3 className="mb-2.5 flex items-center gap-1.5 border-b border-border pb-1.5 text-xs font-bold text-teal">✓ Performance Highlights</h3>
        {good.length === 0 ? (
          <p className="text-[11px] text-muted">No standout highlights for this scope.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {good.map((i, idx) => (
              <li key={idx} className={`relative pl-3.5 text-[11px] leading-relaxed text-text ${TONE_DOT[i.tone]} before:absolute before:left-0`}>
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-border bg-bg2 p-4">
        <h3 className="mb-2.5 flex items-center gap-1.5 border-b border-border pb-1.5 text-xs font-bold text-teal">⚠ Watch Items</h3>
        {watch.length === 0 ? (
          <p className="text-[11px] text-muted">No areas flagged for attention in this scope.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {watch.map((i, idx) => (
              <li key={idx} className={`relative pl-3.5 text-[11px] leading-relaxed text-text ${TONE_DOT[i.tone]} before:absolute before:left-0`}>
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
