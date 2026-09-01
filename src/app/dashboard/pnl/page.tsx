"use client";

import { useMemo } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { COST_COMPONENT_DEFS, convertValue } from "@/lib/calculations";
import { unitLabel, moneyDecimals } from "@/lib/format";
import { buildPnlInsights } from "@/lib/pnl-insights";
import { AutoInsightsPanel } from "@/components/dashboard/AutoInsightsPanel";
import { PivotTable, type PivotRow } from "@/components/dashboard/PivotTable";
import type { PnlRow } from "@/types";

function RoiTierLegend() {
  const tiers = [
    { label: "World Class ≥900% (≥9×)", cls: "bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white" },
    { label: "Excellent 500–900% (5–9×)", cls: "bg-green/[0.18] text-green border border-green/40" },
    { label: "Good 300–500% (3–5×)", cls: "bg-teal/[0.15] text-teal border border-teal/30" },
    { label: "Average 100–300% (1–3×)", cls: "bg-gold/[0.15] text-gold border border-gold/30" },
    { label: "Below <100% (<1×)", cls: "bg-red/[0.15] text-red border border-red/30" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="font-bold text-teal">🏆 ROI Tiers (NVC ÷ Cost Incurred — Hackett Group benchmark):</span>
      {tiers.map((t) => (
        <span key={t.label} className={`whitespace-nowrap rounded-[11px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.03em] ${t.cls}`}>
          {t.label}
        </span>
      ))}
    </div>
  );
}

export default function PnlRoiPage() {
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

  if (isLoading) return <p className="text-sm text-muted">Loading P&amp;L data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (!rows || rows.length === 0) return <p className="text-sm text-muted">No data for this scope yet.</p>;

  const d = moneyDecimals(currency);
  const cv = (v: number) => convertValue(v, currency, rate);

  /** Per-period series for one record type, converted to the active currency. */
  const series = (type: "actual" | "budget", pick: (r: PnlRow) => number, convert = true) =>
    periods.map((p) => {
      const row = lookup.get(`${p.label}__${type}`);
      if (!row) return null;
      const raw = pick(row);
      return convert ? cv(raw) : raw;
    });

  /** Only show cost components that are non-zero somewhere in the current scope. */
  const activeComponents = COST_COMPONENT_DEFS.filter((def) =>
    rows.some((r) => (r.costComponents[def.key] ?? 0) !== 0)
  );

  function section(type: "actual" | "budget", bannerLabel: string): PivotRow[] {
    return [
      { kind: "banner", label: bannerLabel, tone: type === "actual" ? "actual" : "target" },
      { kind: "data", label: "Value Creation", values: series(type, (r) => r.totalValueCreation), decimals: d },
      { kind: "data", label: "— Cost Saving", values: series(type, (r) => r.costSaving), decimals: d, sub: true },
      { kind: "data", label: "— Cost Avoidance", values: series(type, (r) => r.costAvoidance), decimals: d, sub: true },
      {
        kind: "expandable",
        label: "Cost Incurred (Total)",
        values: series(type, (r) => r.totalCostIncurred),
        decimals: d,
        children: activeComponents.map((def) => ({
          label: def.label,
          values: series(type, (r) => r.costComponents[def.key] ?? 0),
        })),
      },
      { kind: "data", label: "Net Value Creation", values: series(type, (r) => r.netValueCreation), decimals: d, tone: "result" },
      { kind: "spacer", key: `${type}-sp1` },
      { kind: "data", label: "Initial SUM (before Saving)", values: series(type, (r) => r.initialSum), decimals: d },
      { kind: "data", label: "SUM after Saving", values: series(type, (r) => r.sumAfterSaving), decimals: d, sub: true },
      { kind: "data", label: "ROI (NVC / Cost Incurred)", values: series(type, (r) => r.roiPct, false), decimals: 0, suffix: "%", tone: "roi" },
      { kind: "data", label: "└ ROI Multiplier (×)", values: series(type, (r) => r.roiPct / 100, false), decimals: 1, suffix: "×", sub: true },
      { kind: "tier", label: `└ ROI Tier (${type === "actual" ? "Actual" : "Target"})`, values: series(type, (r) => r.roiPct, false), scale: "roi", sub: true },
    ];
  }

  const varianceSeries = (pick: (a: PnlRow, b: PnlRow) => number | null) =>
    periods.map((p) => {
      const a = lookup.get(`${p.label}__actual`);
      const b = lookup.get(`${p.label}__budget`);
      if (!a || !b) return null;
      return pick(a, b);
    });

  const tableRows: PivotRow[] = [
    ...section("actual", "Actual"),
    { kind: "spacer", key: "between" },
    ...section("budget", "Target"),
    { kind: "spacer", key: "before-variance" },
    { kind: "banner", label: "VARIANCE", tone: "variance" },
    {
      kind: "data",
      label: "Net Value Creation",
      values: varianceSeries((a, b) => cv(a.netValueCreation - b.netValueCreation)),
      decimals: d,
      tone: "result",
      signed: true,
    },
    {
      kind: "data",
      label: "NVC Variance %",
      values: varianceSeries((a, b) => (b.netValueCreation === 0 ? null : ((a.netValueCreation - b.netValueCreation) / Math.abs(b.netValueCreation)) * 100)),
      decimals: 1,
      suffix: "%",
      signed: true,
    },
    {
      kind: "data",
      label: "ROI Gap (pts)",
      values: varianceSeries((a, b) => a.roiPct - b.roiPct),
      decimals: 0,
      tone: "roi",
      signed: true,
    },
  ];

  const insights = buildPnlInsights(rows, division, currency, rate);

  return (
    <div className="space-y-3.5">
      {insights && (
        <AutoInsightsPanel
          title="Auto-Insights · P&L + ROI"
          insights={insights}
          askPrompt={`Break down the ROI for ${division} across ${insights.periodRange}. What levers moved Net Value Creation most, and what are the biggest cost concentration risks?`}
        />
      )}

      <PivotTable
        title="Full P&L — Net Value Creation with ROI"
        unitTag={`Actual & Target in ${unitLabel(currency)}`}
        legend={<RoiTierLegend />}
        periods={periods}
        rows={tableRows}
      />
    </div>
  );
}
