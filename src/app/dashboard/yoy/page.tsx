"use client";

import { useMemo, useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend } from "chart.js";
import { Chart } from "react-chartjs-2";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { convertValue } from "@/lib/calculations";
import { unitLabel, moneyDecimals } from "@/lib/format";
import { TierBadge } from "@/components/dashboard/TierBadge";
import { valueLabels } from "@/components/dashboard/BcgChart";
import { Card, CardBar } from "@/components/dashboard/Card";
import type { PnlRow } from "@/types";

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

/** The World-Class ROI threshold the gauge always keeps in view. */
const WORLD_CLASS_ROI = 900;

interface MetricDef {
  label: string;
  type: "actual" | "budget";
  kind: "money" | "percent";
  get: (r: PnlRow) => number;
}

const METRICS: MetricDef[] = [
  { label: "Value Creation", type: "actual", kind: "money", get: (r) => r.totalValueCreation },
  { label: "Spending (Initial SUM)", type: "actual", kind: "money", get: (r) => r.initialSum },
  { label: "Net Value Creation", type: "actual", kind: "money", get: (r) => r.netValueCreation },
  { label: "Total Cost Incurred", type: "actual", kind: "money", get: (r) => r.totalCostIncurred },
  { label: "ROI (Actual)", type: "actual", kind: "percent", get: (r) => r.roiPct },
  { label: "Value Creation (Target)", type: "budget", kind: "money", get: (r) => r.totalValueCreation },
  { label: "Net Value Creation (Target)", type: "budget", kind: "money", get: (r) => r.netValueCreation },
  { label: "ROI (Target)", type: "budget", kind: "percent", get: (r) => r.roiPct },
];

/** The four money metrics plotted in the grouped bar chart. */
const CHART_METRICS = METRICS.slice(0, 4);

function deltaPct(a: number, b: number): number | null {
  if (b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

export default function YoyPage() {
  const { division, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year: "All", quarter: "All" });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;
  const d = moneyDecimals(currency);
  const unit = unitLabel(currency);

  const periods = useMemo(() => {
    if (!rows) return [];
    const seen = new Map<string, { label: string; year: number; quarter: number | null; isFy: boolean }>();
    for (const r of rows) seen.set(r.periodLabel, { label: r.periodLabel, year: r.year, quarter: r.quarter, isFy: r.isFy });
    return [...seen.values()].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  }, [rows]);

  const lookup = useMemo(() => {
    const map = new Map<string, PnlRow>();
    for (const r of rows ?? []) map.set(`${r.periodLabel}__${r.recordType}`, r);
    return map;
  }, [rows]);

  const fyPeriods = periods.filter((p) => p.isFy);
  const defaultBase = fyPeriods.at(-1)?.label ?? periods.at(-1)?.label ?? "";
  const defaultCompare = fyPeriods.at(-2)?.label ?? periods.at(-2)?.label ?? "";

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

  const valueFor = (period: string, m: MetricDef): number | null => {
    const row = lookup.get(`${period}__${m.type}`);
    if (!row) return null;
    const raw = m.get(row);
    return m.kind === "money" ? convertValue(raw, currency, rate) : raw;
  };

  const fmt = (v: number | null, kind: MetricDef["kind"]) => (v === null ? "—" : kind === "percent" ? `${v.toFixed(1)}%` : `${v.toFixed(d)}`);

  // Preset buttons only offered when both FY periods actually exist in the data.
  const presets = fyPeriods.length >= 2 ? [[fyPeriods.at(-1)!.label, fyPeriods.at(-2)!.label], ...(fyPeriods.length >= 3 ? [[fyPeriods.at(-2)!.label, fyPeriods.at(-3)!.label]] : [])] : [];

  const roiBase = valueFor(base, METRICS[4]);
  const roiComp = valueFor(compare, METRICS[4]);
  const roiMax = Math.max(roiBase ?? 0, roiComp ?? 0, WORLD_CLASS_ROI) * 1.08;
  const roiDelta = roiBase !== null && roiComp !== null ? deltaPct(roiBase, roiComp) : null;

  return (
    <div className="space-y-3.5">
      {/* Period picker bar */}
      <div data-ui="card" className="flex flex-wrap items-center gap-3.5 rounded-xl border border-border bg-bg2 px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal">📈 Period-over-Period Comparison</span>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] text-muted">
          Base:
          <select value={base} onChange={(e) => setBase(e.target.value)} className="rounded-md border border-border bg-bg3 px-2.5 py-1 text-[11px] font-semibold text-text outline-none">
            {periods.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[11px] font-bold tracking-[0.05em] text-gold">vs</span>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] text-muted">
          Compare:
          <select value={compare} onChange={(e) => setCompare(e.target.value)} className="rounded-md border border-border bg-bg3 px-2.5 py-1 text-[11px] font-semibold text-text outline-none">
            {periods.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {presets.map(([b, c]) => (
            <button
              key={`${b}-${c}`}
              onClick={() => {
                setBase(b);
                setCompare(c);
              }}
              className="rounded-[7px] border border-border bg-bg3 px-3 py-1.5 text-[11px] font-semibold text-light transition hover:border-teal/30 hover:text-teal"
            >
              {b.replace("FY 20", "FY")} vs {c.replace("FY 20", "FY")}
            </button>
          ))}
        </div>
      </div>

      {!base || !compare ? (
        <p className="text-sm text-muted">Pick two periods to compare.</p>
      ) : (
        <>
          {/* Side-by-side metric cards */}
          <div data-ui="card" className="rounded-xl border border-border bg-bg2 p-[18px]">
            <div className="mb-3.5 text-[12px] font-bold uppercase tracking-[0.08em] text-teal">Side-by-Side Metrics</div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              {METRICS.map((m) => {
                const b = valueFor(base, m);
                const c = valueFor(compare, m);
                const chg = b !== null && c !== null ? deltaPct(b, c) : null;
                return (
                  <div key={m.label} className="rounded-[10px] border border-border bg-bg3 p-3.5">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.08em] text-muted">{m.label}</div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-text">
                      <span>{base}</span>
                      <b className="font-mono font-medium">{fmt(b, m.kind)}</b>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>{compare}</span>
                      <b className="font-mono font-medium">{fmt(c, m.kind)}</b>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2 font-mono text-[13px] font-semibold">
                      <span className="text-[10px] uppercase tracking-[0.06em] text-muted">Change</span>
                      {chg === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className={chg >= 0 ? "text-green" : "text-red"}>
                          {chg >= 0 ? "↑" : "↓"} {chg >= 0 ? "+" : ""}
                          {chg.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {m.kind === "percent" && b !== null && (
                      <div className="mt-2">
                        <TierBadge roiPct={b} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Money chart + ROI gauges */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <Card>
              <CardBar>
                <span>Value &amp; Cost Metrics</span>
                <span className="font-normal normal-case text-muted">Base vs Compare across key metrics</span>
                <span className="ml-auto rounded bg-blueHdr/20 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case text-[#93c5fd]">{unit}</span>
              </CardBar>
              <div className="p-3.5">
                <div className="relative h-[260px]">
                  <Chart
                    type="bar"
                    plugins={[valueLabels]}
                    data={{
                      labels: CHART_METRICS.map((m) => m.label.replace(" (Initial SUM)", "")),
                      datasets: [
                        { type: "bar" as const, label: base, data: CHART_METRICS.map((m) => valueFor(base, m) ?? 0), backgroundColor: "#00d4f5", borderRadius: 2 },
                        { type: "bar" as const, label: compare, data: CHART_METRICS.map((m) => valueFor(compare, m) ?? 0), backgroundColor: "#f5a623", borderRadius: 2 },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      layout: { padding: { top: 20 } },
                      plugins: { legend: { display: true, position: "bottom", labels: { color: "#8ba8c4", font: { size: 10 }, boxWidth: 12 } } },
                      scales: {
                        x: { ticks: { color: "#5e7a98", font: { size: 10 } }, grid: { display: false } },
                        y: { ticks: { color: "#5e7a98", font: { size: 10 } }, grid: { color: "#253348" } },
                      },
                    }}
                  />
                </div>
              </div>
            </Card>

            <Card>
              <CardBar>
                <span>Return on Investment</span>
                <span className="font-normal normal-case text-muted">NVC ÷ Total Cost Incurred</span>
              </CardBar>
              <div className="space-y-4 p-4">
                {[
                  { label: base, roi: roiBase },
                  { label: compare, roi: roiComp },
                ].map((g) => (
                  <div key={g.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-text">{g.label}</span>
                      <span className="font-mono font-bold text-teal">{g.roi === null ? "—" : `${g.roi.toFixed(0)}% · ${(g.roi / 100).toFixed(1)}×`}</span>
                    </div>
                    <div className="relative h-5 overflow-hidden rounded-full bg-bg3">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal to-[#0891b2]" style={{ width: `${Math.min(100, ((g.roi ?? 0) / roiMax) * 100)}%` }} />
                      {/* World-Class marker stays on screen because roiMax is floored at 900 × 1.08 */}
                      <div className="absolute inset-y-0 border-l-2 border-dashed border-gold" style={{ left: `${(WORLD_CLASS_ROI / roiMax) * 100}%` }} />
                    </div>
                    {g.roi !== null && (
                      <div className="mt-1.5">
                        <TierBadge roiPct={g.roi} />
                      </div>
                    )}
                  </div>
                ))}
                <div className="text-right text-[9.5px] font-semibold text-gold">▼ World-Class 9× ({WORLD_CLASS_ROI}%)</div>

                <div className="rounded-[10px] border border-border bg-bg3 p-3.5">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-muted">
                    ROI Change {compare} → {base}
                  </div>
                  {roiDelta === null ? (
                    <div className="font-mono text-[20px] font-bold text-muted">—</div>
                  ) : (
                    <div className={`font-mono text-[20px] font-bold ${roiDelta >= 0 ? "text-green" : "text-red"}`}>
                      {roiDelta >= 0 ? "▲" : "▼"} {roiDelta >= 0 ? "+" : ""}
                      {roiDelta.toFixed(1)}%
                    </div>
                  )}
                  {roiBase !== null && roiComp !== null && (
                    <div className="mt-1 text-[10px] text-muted">
                      {roiComp.toFixed(0)}% → {roiBase.toFixed(0)}% · {(roiBase - roiComp >= 0 ? "+" : "") + (roiBase - roiComp).toFixed(0)} pts
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed table */}
          <Card>
            <CardBar>
              <span>Detailed Comparison Table</span>
              <span className="ml-auto rounded bg-blueHdr/20 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case text-[#93c5fd]">{unit}</span>
            </CardBar>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0c1524] text-light">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold">Metric</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold">{base}</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold">{compare}</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold">Δ Abs</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold">Δ %</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m) => {
                    const b = valueFor(base, m);
                    const c = valueFor(compare, m);
                    const abs = b !== null && c !== null ? b - c : null;
                    const chg = b !== null && c !== null ? deltaPct(b, c) : null;
                    const isRoi = m.kind === "percent";
                    return (
                      <tr key={m.label} className={`border-b border-border/40 ${isRoi ? "bg-gold/[0.05]" : ""}`}>
                        <td className={`px-3 py-1.5 ${isRoi ? "font-semibold text-gold" : "text-text"}`}>{m.label}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{fmt(b, m.kind)}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-muted">{fmt(c, m.kind)}</td>
                        <td className={`px-3 py-1.5 text-right font-mono font-semibold ${abs === null ? "text-muted" : abs >= 0 ? "text-green" : "text-red"}`}>
                          {abs === null ? "—" : `${abs >= 0 ? "+" : ""}${abs.toFixed(isRoi ? 0 : d)}${isRoi ? " pts" : ""}`}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono font-semibold ${chg === null ? "text-muted" : chg >= 0 ? "text-green" : "text-red"}`}>
                          {chg === null ? "—" : `${chg >= 0 ? "+" : ""}${chg.toFixed(1)}%`}
                        </td>
                        <td className="px-3 py-1.5 text-right">{isRoi && b !== null ? <TierBadge roiPct={b} /> : <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
