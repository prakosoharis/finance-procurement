import type { PnlRow } from "@/types";
import type { ChartMetric } from "@/store/useFilterStore";
import { convertValue } from "@/lib/calculations";

export interface MetricConfig {
  title: string;
  barLabel: string;
  lineLabel: string;
  /** Bar value (money, in USD millions before currency conversion). */
  bar: (r: PnlRow) => number;
  /** Overlay line value (already a percentage). */
  line: (r: PnlRow) => number;
  /** For these metrics a *lower* actual than budget is favourable. */
  lowerIsBetter: boolean;
}

export const METRIC_CFG: Record<ChartMetric, MetricConfig> = {
  sum: {
    title: "SUM after Saving",
    barLabel: "SUM after saving",
    lineLabel: "Value to Initial SUM",
    bar: (r) => r.sumAfterSaving,
    line: (r) => r.valueToSumPct,
    lowerIsBetter: true,
  },
  vc: {
    title: "Value Creation",
    barLabel: "Value creation",
    lineLabel: "Value to Initial SUM",
    bar: (r) => r.totalValueCreation,
    line: (r) => r.valueToSumPct,
    lowerIsBetter: false,
  },
  nvc: {
    title: "Net Value Creation",
    barLabel: "Net value creation",
    lineLabel: "NVC ÷ Cost (ROI %)",
    bar: (r) => r.netValueCreation,
    line: (r) => r.roiPct,
    lowerIsBetter: false,
  },
  cost: {
    title: "Cost Incurred",
    barLabel: "Cost incurred",
    lineLabel: "Cost ÷ SUM",
    bar: (r) => r.totalCostIncurred,
    line: (r) => (r.initialSum > 0 ? (r.totalCostIncurred / r.initialSum) * 100 : 0),
    lowerIsBetter: true,
  },
};

export interface PanelSeries {
  labels: string[];
  actualBar: number[];
  budgetBar: number[];
  actualLine: number[];
  budgetLine: number[];
  actualRoi: (number | null)[];
  budgetRoi: (number | null)[];
  achievement: (number | null)[];
}

/**
 * Chart columns: one point per full year when the scope spans all years, otherwise the
 * selected year's quarters. Mixing FY totals with their own quarters on one axis would
 * plot the same money twice at wildly different scales.
 */
export function buildChartSeries(rows: PnlRow[], metric: ChartMetric, year: string, currency: "USD" | "IDR", rate: number): PanelSeries {
  const cfg = METRIC_CFG[metric];
  const actualRows = rows.filter((r) => r.recordType === "actual");
  const useFy = year === "All";
  const picked = actualRows
    .filter((r) => (useFy ? r.isFy : !r.isFy))
    .sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));

  const byLabel = new Map<string, PnlRow>();
  for (const r of rows) byLabel.set(`${r.periodLabel}__${r.recordType}`, r);

  const labels = picked.map((r) => r.periodLabel);
  const cv = (v: number) => convertValue(v, currency, rate);

  const actualBar = picked.map((r) => cv(cfg.bar(r)));
  const actualLine = picked.map((r) => cfg.line(r));
  const budgetBar = labels.map((l) => {
    const b = byLabel.get(`${l}__budget`);
    return b ? cv(cfg.bar(b)) : 0;
  });
  const budgetLine = labels.map((l) => {
    const b = byLabel.get(`${l}__budget`);
    return b ? cfg.line(b) : 0;
  });
  const actualRoi = picked.map((r) => r.roiPct);
  const budgetRoi = labels.map((l) => {
    const b = byLabel.get(`${l}__budget`);
    return b ? b.roiPct : null;
  });
  const achievement = picked.map((r, i) => {
    const b = byLabel.get(`${labels[i]}__budget`);
    if (!b || b.totalValueCreation === 0) return null;
    return r.totalValueCreation / b.totalValueCreation;
  });

  return { labels, actualBar, budgetBar, actualLine, budgetLine, actualRoi, budgetRoi, achievement };
}

/** Compound annual growth rate across the series, expressed as a percentage. */
export function cagr(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return null;
  const start = clean[0];
  const end = clean[clean.length - 1];
  const periods = clean.length - 1;
  if (start <= 0 || end <= 0 || periods <= 0) return null;
  return (Math.pow(end / start, 1 / periods) - 1) * 100;
}

export function average(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export interface VarianceCard {
  label: string;
  value: string;
  sub: string;
  tone: "pos" | "neg" | "neu";
}

export function buildTakeaway(series: PanelSeries, metric: ChartMetric, division: string): string {
  const cfg = METRIC_CFG[metric];
  if (series.labels.length === 0) return "No data in the current scope.";

  const actCagr = cagr(series.actualBar);
  const budCagr = cagr(series.budgetBar);
  const lastIdx = series.labels.length - 1;
  const lastAct = series.actualBar[lastIdx];
  const lastBud = series.budgetBar[lastIdx];
  const variancePct = lastBud !== 0 ? ((lastAct - lastBud) / Math.abs(lastBud)) * 100 : null;

  if (actCagr !== null && budCagr !== null) {
    const gap = actCagr - budCagr;
    const lead = gap >= 0 ? "outpaced plan" : "grew slower than plan";
    let text = `${division} ${cfg.title.toLowerCase()} ${lead} — Actual CAGR ${actCagr.toFixed(1)}% vs Budget CAGR ${budCagr.toFixed(1)}%, a ${Math.abs(gap).toFixed(
      1
    )}pt ${gap >= 0 ? "advantage" : "gap"}.`;
    if (variancePct !== null && Math.abs(variancePct) > 2) {
      text += ` Latest period (${series.labels[lastIdx]}) is ${variancePct >= 0 ? "above" : "below"} plan by ${Math.abs(variancePct).toFixed(1)}%.`;
    }
    return text;
  }

  if (variancePct !== null) {
    return `${division} ${cfg.title.toLowerCase()} in ${series.labels[lastIdx]} is ${variancePct >= 0 ? "above" : "below"} plan by ${Math.abs(variancePct).toFixed(1)}%.`;
  }
  return `${division} ${cfg.title.toLowerCase()} in ${series.labels[lastIdx]}: ${lastAct.toFixed(2)}.`;
}

export function buildVarianceCards(series: PanelSeries, metric: ChartMetric, unit: string): VarianceCard[] {
  const cfg = METRIC_CFG[metric];
  if (series.labels.length === 0) return [];

  const totalAct = series.actualBar.reduce((a, b) => a + b, 0);
  const totalBud = series.budgetBar.reduce((a, b) => a + b, 0);
  const delta = totalAct - totalBud;
  // For spend-style metrics coming in *under* budget is the good outcome.
  const favourable = cfg.lowerIsBetter ? delta <= 0 : delta >= 0;
  const deltaPct = totalBud !== 0 ? (delta / Math.abs(totalBud)) * 100 : null;

  const peakIdx = series.actualBar.reduce((best, v, i) => (v > series.actualBar[best] ? i : best), 0);
  const actEff = average(series.actualLine);
  const budEff = average(series.budgetLine);
  const effGap = actEff - budEff;

  const lastRoi = series.actualRoi[series.actualRoi.length - 1];

  const cards: VarianceCard[] = [
    {
      label: "Total Actual vs Budget",
      value: `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)} ${unit}`,
      sub: deltaPct !== null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs plan · ${favourable ? "favourable" : "unfavourable"}` : "no budget in scope",
      tone: favourable ? "pos" : "neg",
    },
    {
      label: "Peak Period",
      value: series.actualBar[peakIdx].toFixed(2),
      sub: `${series.labels[peakIdx]} · highest ${cfg.barLabel.toLowerCase()}`,
      tone: "neu",
    },
    {
      label: "Avg Efficiency Gap",
      value: `${effGap >= 0 ? "+" : ""}${effGap.toFixed(2)} pts`,
      sub: `${cfg.lineLabel}: ${actEff.toFixed(2)}% actual vs ${budEff.toFixed(2)}% plan`,
      tone: effGap >= 0 ? "pos" : "neg",
    },
  ];

  if (lastRoi !== null && lastRoi !== undefined) {
    cards.push({
      label: "Latest ROI",
      value: `${lastRoi.toFixed(0)}%`,
      sub: `${series.labels[series.labels.length - 1]} · NVC ÷ Cost Incurred`,
      tone: lastRoi >= 300 ? "pos" : "neu",
    });
  }

  return cards;
}
