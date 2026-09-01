"use client";

import { useMemo } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { convertValue } from "@/lib/calculations";
import { unitLabel, moneyDecimals } from "@/lib/format";
import { RATIO_DEFS } from "@/lib/ratio-benchmarks";
import { buildRatioInsights } from "@/lib/ratio-insights";
import { AutoInsightsPanel } from "@/components/dashboard/AutoInsightsPanel";
import { PivotTable, type PivotRow } from "@/components/dashboard/PivotTable";
import { TIER_CLASS } from "@/components/dashboard/TierBadge";
import type { PnlRow } from "@/types";

const TIER_ORDER = ["wc", "exc", "good", "avg", "below"] as const;

function BenchmarkLegend() {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold text-teal">🏆 Benchmark Tiers &amp; Sources · click a source to open it in a new tab</div>
      {RATIO_DEFS.map((def) => (
        <div key={def.key} className="flex flex-wrap items-center gap-1.5">
          <span className="w-[68px] flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.04em] text-light">{def.legendLabel}</span>
          {def.legend.map((text, i) => (
            <span key={text} className={`whitespace-nowrap rounded-[11px] px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.03em] ${TIER_CLASS[TIER_ORDER[i]]}`}>
              {text}
            </span>
          ))}
          <a href={def.source.url} target="_blank" rel="noreferrer" className="text-[10px] italic text-muted underline-offset-2 hover:text-teal hover:underline">
            {def.source.label}
          </a>
        </div>
      ))}
    </div>
  );
}

export default function RatiosPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const periods = useMemo(() => {
    if (!rows) return [];
    const seen = new Map<string, { label: string; isFy: boolean; year: number; quarter: number | null }>();
    for (const r of rows) seen.set(r.periodLabel, { label: r.periodLabel, isFy: r.isFy, year: r.year, quarter: r.quarter });
    return [...seen.values()].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5)).map((p) => ({ label: p.label, isFy: p.isFy }));
  }, [rows]);

  const lookup = useMemo(() => {
    const map = new Map<string, PnlRow>();
    for (const r of rows ?? []) map.set(`${r.periodLabel}__${r.recordType}`, r);
    return map;
  }, [rows]);

  if (isLoading) return <p className="text-sm text-muted">Loading ratio data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  const hasRevenue = (rows ?? []).some((r) => r.revenue > 0 || r.grossProfit > 0);
  if (!hasRevenue) {
    return (
      <p className="text-sm text-muted">
        No Revenue or Gross Profit data for <b className="text-text">{division}</b> in this scope. These ratios only apply to periods where the source file included Revenue and GP —
        try the SMM division or Combine.
      </p>
    );
  }

  const d = moneyDecimals(currency);
  const cv = (v: number) => convertValue(v, currency, rate);

  const series = (type: "actual" | "budget", pick: (r: PnlRow) => number | null, convert: boolean) =>
    periods.map((p) => {
      const row = lookup.get(`${p.label}__${type}`);
      if (!row) return null;
      const raw = pick(row);
      if (raw === null) return null;
      return convert ? cv(raw) : raw;
    });

  function section(type: "actual" | "budget", bannerLabel: string): PivotRow[] {
    const out: PivotRow[] = [
      { kind: "banner", label: bannerLabel, tone: type === "actual" ? "actual" : "target" },
      { kind: "data", label: "Revenue", values: series(type, (r) => r.revenue, true), decimals: d },
      { kind: "data", label: "Gross Profit", values: series(type, (r) => r.grossProfit, true), decimals: d },
      {
        kind: "data",
        label: "└ GP margin (% of Revenue)",
        values: series(type, (r) => (r.revenue > 0 ? (r.grossProfit / r.revenue) * 100 : null), false),
        decimals: 1,
        suffix: "%",
        sub: true,
      },
      { kind: "spacer", key: `${type}-sp0` },
    ];

    RATIO_DEFS.forEach((def, i) => {
      out.push({
        kind: "data",
        label: def.label,
        values: series(type, def.value, false),
        decimals: 2,
        suffix: "%",
        tone: def.emphasis ? "result" : "plain",
        tierFor: def.tierFor,
      });
      // Blank line between each metric family (SUM, VC, NVC), as in the reference.
      if (i % 2 === 1 && i < RATIO_DEFS.length - 1) out.push({ kind: "spacer", key: `${type}-sp${i}` });
    });

    return out;
  }

  const tableRows: PivotRow[] = [...section("actual", "Actual"), { kind: "spacer", key: "between" }, ...section("budget", "Target")];

  const insights = buildRatioInsights(rows ?? [], division, currency, rate);

  return (
    <div className="space-y-3.5">
      {insights && (
        <AutoInsightsPanel
          title="Auto-Insights · Ratio to Revenue &amp; GP"
          insights={insights}
          askPrompt={`Review our procurement ratios to Revenue and Gross Profit for ${division} across ${insights.periodRange}. Which ratio is weakest against benchmark and what would move it up a tier?`}
        />
      )}

      <PivotTable
        title="📊 Ratio to Revenue &amp; GP"
        subtitle="[Spend, value and net value as a share of company Revenue / Gross Profit]"
        unitTag={`Actual & Target in ${unitLabel(currency)}`}
        legend={<BenchmarkLegend />}
        periods={periods}
        rows={tableRows}
      />
    </div>
  );
}
