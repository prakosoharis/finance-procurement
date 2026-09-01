"use client";

import { useMemo, useState, useEffect } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { formatMoney, formatPct } from "@/lib/calculations";
import { useFxLive } from "@/hooks/useFxRates";
import { TierBadge } from "@/components/dashboard/TierBadge";

const METRICS = [
  { key: "totalValueCreation", label: "Value Creation" },
  { key: "initialSum", label: "Spending (Initial SUM)" },
  { key: "netValueCreation", label: "Net Value Creation" },
  { key: "totalCostIncurred", label: "Total Cost Incurred" },
] as const;

function delta(a: number, b: number) {
  if (b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

export default function YoyPage() {
  const { division, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year: "All", quarter: "All", type: "actual" });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const periods = useMemo(() => {
    if (!rows) return [];
    const seen = new Map<string, (typeof rows)[number]>();
    for (const r of rows) seen.set(r.periodLabel, r);
    return [...seen.values()].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  }, [rows]);

  const fyPeriods = periods.filter((p) => p.isFy);
  const defaultBase = fyPeriods.length >= 1 ? fyPeriods[fyPeriods.length - 1].periodLabel : periods[periods.length - 1]?.periodLabel ?? "";
  const defaultCompare = fyPeriods.length >= 2 ? fyPeriods[fyPeriods.length - 2].periodLabel : periods[periods.length - 2]?.periodLabel ?? "";

  const [base, setBase] = useState("");
  const [compare, setCompare] = useState("");

  useEffect(() => {
    if (!base && defaultBase) setBase(defaultBase);
    if (!compare && defaultCompare) setCompare(defaultCompare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBase, defaultCompare]);

  if (isLoading) return <p className="text-sm text-muted">Loading YoY data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (periods.length < 2) return <p className="text-sm text-muted">Need at least two periods with data to compare — upload more history first.</p>;

  const baseRow = periods.find((p) => p.periodLabel === base);
  const compareRow = periods.find((p) => p.periodLabel === compare);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg2 px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal">📈 Period-over-Period Comparison</span>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          Base
          <select value={base} onChange={(e) => setBase(e.target.value)} className="rounded border border-border bg-bg3 px-2 py-1 text-xs text-text outline-none">
            {periods.map((p) => (
              <option key={p.periodLabel} value={p.periodLabel}>
                {p.periodLabel}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[11px] font-bold text-gold">vs</span>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          Compare
          <select value={compare} onChange={(e) => setCompare(e.target.value)} className="rounded border border-border bg-bg3 px-2 py-1 text-xs text-text outline-none">
            {periods.map((p) => (
              <option key={p.periodLabel} value={p.periodLabel}>
                {p.periodLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!baseRow || !compareRow ? (
        <p className="text-sm text-muted">Pick two periods to compare.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((m) => {
              const baseVal = Number(baseRow[m.key]);
              const compVal = Number(compareRow[m.key]);
              const d = delta(baseVal, compVal);
              return (
                <div key={m.key} className="rounded-xl border border-border bg-bg2 p-3.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{m.label}</p>
                  <div className="flex items-center justify-between text-[11px] text-text">
                    <span>{baseRow.periodLabel}</span>
                    <b className="font-mono">{formatMoney(baseVal, currency, rate)}</b>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>{compareRow.periodLabel}</span>
                    <b className="font-mono">{formatMoney(compVal, currency, rate)}</b>
                  </div>
                  {d !== null && (
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 font-mono text-sm font-semibold">
                      <span className="text-[10px] uppercase text-muted">Change</span>
                      <span className={d >= 0 ? "text-green" : "text-red"}>
                        {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-bg2">
            <div className="border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">Detailed Comparison Table</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#0c1524] text-light">
                  <th className="px-3 py-2 text-left font-semibold">Metric</th>
                  <th className="px-3 py-2 text-right font-medium">{baseRow.periodLabel}</th>
                  <th className="px-3 py-2 text-right font-medium">{compareRow.periodLabel}</th>
                  <th className="px-3 py-2 text-right font-medium">Δ Abs</th>
                  <th className="px-3 py-2 text-right font-medium">Δ %</th>
                  <th className="px-3 py-2 text-right font-medium">Tier</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const baseVal = Number(baseRow[m.key]);
                  const compVal = Number(compareRow[m.key]);
                  const d = delta(baseVal, compVal);
                  return (
                    <tr key={m.key} className="border-b border-border/40">
                      <td className="px-3 py-1.5 text-text">{m.label}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatMoney(baseVal, currency, rate)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted">{formatMoney(compVal, currency, rate)}</td>
                      <td className={`px-3 py-1.5 text-right font-mono font-semibold ${baseVal - compVal >= 0 ? "text-green" : "text-red"}`}>
                        {formatMoney(baseVal - compVal, currency, rate)}
                      </td>
                      <td className={`px-3 py-1.5 text-right font-mono font-semibold ${d !== null && d >= 0 ? "text-green" : "text-red"}`}>{d !== null ? `${d.toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-1.5 text-right">—</td>
                    </tr>
                  );
                })}
                <tr className="border-b border-border/40 bg-teal/[0.03]">
                  <td className="px-3 py-1.5 font-semibold text-teal">ROI (NVC / Cost Incurred)</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-teal">{formatPct(baseRow.roiPct)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted">{formatPct(compareRow.roiPct)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${baseRow.roiPct - compareRow.roiPct >= 0 ? "text-green" : "text-red"}`}>
                    {(baseRow.roiPct - compareRow.roiPct).toFixed(1)} pts
                  </td>
                  <td className="px-3 py-1.5 text-right">—</td>
                  <td className="px-3 py-1.5 text-right">
                    <TierBadge roiPct={baseRow.roiPct} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
