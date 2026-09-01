"use client";

import { useMemo } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { buildAvtInsights } from "@/lib/avt-insights";
import { AutoInsightsPanel } from "@/components/dashboard/AutoInsightsPanel";
import { AvtPivotTable, type PivotRowDef } from "@/components/dashboard/AvtPivotTable";
import type { PnlRow } from "@/types";

export default function ActualVsTargetPage() {
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

  const getRow = useMemo(() => {
    const map = new Map<string, PnlRow>();
    for (const r of rows ?? []) map.set(`${r.periodLabel}__${r.recordType}`, r);
    return (period: string, type: "actual" | "budget") => map.get(`${period}__${type}`);
  }, [rows]);

  if (isLoading) return <p className="text-sm text-muted">Loading P&amp;L data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No data for this scope yet. {division !== "Combine" ? "Try a different division/year, or " : ""}
        ask an admin to upload the procurement database file.
      </p>
    );
  }

  const insights = buildAvtInsights(rows, division, currency, rate);
  const unitTag = currency === "USD" ? "Actual & Target in USD Mn" : "Actual & Target in IDR Bn";

  const vsrActualRows: PivotRowDef[] = [
    { label: "Value Creation", get: (r) => r.totalValueCreation, kind: "money" },
    { label: "SUM", get: (r) => r.initialSum, kind: "money" },
    { label: "Value to SUM Ratio - Actual", get: (r) => r.valueToSumPct, kind: "percent", bold: true },
    { label: "Tier (Actual)", get: (r) => r.valueToSumPct, kind: "tier", indent: true },
  ];
  const vsrTargetRows: PivotRowDef[] = [
    { label: "Value Creation", get: (r) => r.totalValueCreation, kind: "money" },
    { label: "SUM", get: (r) => r.initialSum, kind: "money" },
    { label: "Value to SUM Ratio - Target", get: (r) => r.valueToSumPct, kind: "percent", bold: true },
    { label: "Tier (Target)", get: (r) => r.valueToSumPct, kind: "tier", indent: true },
  ];

  const vcActualRows: PivotRowDef[] = [
    { label: "Cost Saving", get: (r) => r.costSaving, kind: "money" },
    { label: "Cost Avoidance", get: (r) => r.costAvoidance, kind: "money" },
    { label: "Total Value Creation", get: (r) => r.totalValueCreation, kind: "money", bold: true },
  ];

  const sumActualRows: PivotRowDef[] = [
    { label: "Initial SUM", get: (r) => r.initialSum, kind: "money" },
    { label: "SUM after Saving", get: (r) => r.sumAfterSaving, kind: "money", bold: true },
  ];

  return (
    <div className="space-y-3.5">
      {insights && (
        <AutoInsightsPanel
          title="Auto-Insights · Actual vs Target"
          insights={insights}
          askPrompt={`Break down our Actual vs Target performance for ${division} across ${insights.periodRange}. What's driving the variance and where should we focus next quarter?`}
        />
      )}

      <div className="rounded-lg border border-border bg-bg2 px-4 py-2.5 text-[11px] text-light">
        📊 <b className="text-text">Value-to-SUM Tiers</b> (Ardent Partners / CAPS / Bain benchmarks): <span className="font-bold text-green">World Class ≥6%</span> ·{" "}
        <span className="font-bold text-teal">Excellent 4–6%</span> · <span className="font-bold text-gold">Good 2–4%</span> ·{" "}
        <span className="font-bold text-muted">Average 1–2%</span> · <span className="font-bold text-red">Below Avg &lt;1%</span>
      </div>

      <AvtPivotTable
        title="1. Value to SUM Ratio"
        subtitle="[VC / SUM]"
        unitTag={unitTag}
        periods={periods}
        getRow={getRow}
        actualRows={vsrActualRows}
        targetRows={vsrTargetRows}
        currency={currency}
        rate={rate}
        gapRow={{
          label: "Gap Actual vs Target (pts)",
          isPercent: true,
          get: (a, t) => (a && t ? a.valueToSumPct - t.valueToSumPct : null),
        }}
      />

      <AvtPivotTable
        title="2. Value Creation"
        subtitle="[Actual vs Target]"
        unitTag={unitTag}
        periods={periods}
        getRow={getRow}
        actualRows={vcActualRows}
        targetRows={vcActualRows}
        currency={currency}
        rate={rate}
        gapRow={{
          label: "Gap Actual vs Target",
          get: (a, t) => (a && t ? a.totalValueCreation - t.totalValueCreation : null),
        }}
      />

      <AvtPivotTable
        title="3. SUM"
        subtitle="[Actual vs Target]"
        unitTag={unitTag}
        periods={periods}
        getRow={getRow}
        actualRows={sumActualRows}
        targetRows={sumActualRows}
        currency={currency}
        rate={rate}
        gapRow={{
          label: "Gap Actual vs Target",
          get: (a, t) => (a && t ? a.initialSum - t.initialSum : null),
        }}
      />
    </div>
  );
}
