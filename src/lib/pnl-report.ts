import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, convertValue } from "@/lib/calculations";

export type ReportMode = "actual" | "budget";

export interface ReportLine {
  label: string;
  /** One value per period column; null renders as an em-dash. */
  values: (number | null)[];
  style: "category" | "sub" | "net" | "sumInit" | "sumAfter" | "ratio" | "section" | "spacer" | "periods";
}

export interface ReportModel {
  mode: ReportMode;
  title: string;
  divisionTag: string;
  unit: string;
  periods: string[];
  lines: ReportLine[];
}

/**
 * Report columns: full years only when the scope is "all years / all quarters",
 * otherwise every period in scope. A board report listing 25 columns (quarters *and*
 * their own FY totals) is unreadable and double-counts on the page.
 */
export function reportPeriods(rows: PnlRow[], year: string, quarter: string): string[] {
  const seen = new Map<string, { label: string; year: number; quarter: number | null; isFy: boolean }>();
  for (const r of rows) seen.set(r.periodLabel, { label: r.periodLabel, year: r.year, quarter: r.quarter, isFy: r.isFy });
  const all = [...seen.values()].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  const fyOnly = year === "All" && quarter === "All";
  const picked = fyOnly ? all.filter((p) => p.isFy) : all;
  return (picked.length > 0 ? picked : all).map((p) => p.label);
}

export function buildReportModel(
  rows: PnlRow[],
  mode: ReportMode,
  division: string,
  periods: string[],
  currency: "USD" | "IDR",
  rate: number
): ReportModel {
  const byPeriod = new Map<string, PnlRow>();
  for (const r of rows) {
    if (r.recordType === mode) byPeriod.set(r.periodLabel, r);
  }

  const cv = (v: number) => convertValue(v, currency, rate);
  const money = (pick: (r: PnlRow) => number): (number | null)[] => periods.map((p) => (byPeriod.has(p) ? cv(pick(byPeriod.get(p)!)) : null));
  const pct = (pick: (r: PnlRow) => number): (number | null)[] => periods.map((p) => (byPeriod.has(p) ? pick(byPeriod.get(p)!) : null));

  const lines: ReportLine[] = [
    { label: "NVC Statement", values: [], style: "section" },
    { label: "", values: [], style: "periods" },
    { label: "Value Creation", values: money((r) => r.totalValueCreation), style: "category" },
    { label: "Cost Saving", values: money((r) => r.costSaving), style: "sub" },
    { label: "Cost Avoidance", values: money((r) => r.costAvoidance), style: "sub" },
    { label: "", values: [], style: "spacer" },
    { label: "Costs Incurred", values: money((r) => r.totalCostIncurred), style: "category" },
    // The report always lists all 15 components, even the zero ones — unlike the P&L tab,
    // which hides components that are zero across the whole scope.
    ...COST_COMPONENT_DEFS.map((def) => ({
      label: def.label,
      values: money((r) => r.costComponents[def.key] ?? 0),
      style: "sub" as const,
    })),
    { label: "", values: [], style: "spacer" },
    { label: "Net Value Creation", values: money((r) => r.netValueCreation), style: "net" },
    { label: "", values: [], style: "spacer" },
    { label: "Initial SUM", values: money((r) => r.initialSum), style: "sumInit" },
    { label: "SUM after Saving", values: money((r) => r.sumAfterSaving), style: "sumAfter" },
    { label: "", values: [], style: "spacer" },
    { label: "Ratios", values: [], style: "section" },
    { label: "", values: [], style: "periods" },
    { label: "ROI (Net Value / Costs)", values: pct((r) => r.roiPct), style: "ratio" },
    { label: "Value to SUM", values: pct((r) => r.valueToSumPct), style: "ratio" },
  ];

  return {
    mode,
    title: `${mode === "actual" ? "ACTUAL" : "BUDGET"} — in ${currency === "USD" ? "USD Mn" : "IDR Bn"}`,
    divisionTag: division === "Combine" ? "Combined" : division,
    unit: currency === "USD" ? "USD Mn" : "IDR Bn",
    periods,
    lines,
  };
}

/** Report figures: em-dash for ~zero, parentheses for negatives. */
export function reportFmt(v: number | null, decimals = 2): string {
  if (v === null) return "—";
  if (Math.abs(v) < 0.5 / 10 ** decimals) return "—";
  const abs = Math.abs(v).toFixed(decimals);
  return v < 0 ? `(${abs})` : abs;
}

export function reportPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}
