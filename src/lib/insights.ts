import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, formatPct } from "@/lib/calculations";

export interface Insight {
  text: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

/** Deterministic narrative built from aggregated pnl_data — no AI/API cost. */
export function buildInsights(rows: PnlRow[]): Insight[] {
  if (rows.length === 0) return [];
  const insights: Insight[] = [];

  const actuals = rows.filter((r) => r.recordType === "actual");
  const budgets = rows.filter((r) => r.recordType === "budget");
  const sum = (list: PnlRow[], key: keyof PnlRow) => list.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  if (actuals.length && budgets.length) {
    const actualNvc = sum(actuals, "netValueCreation");
    const budgetNvc = sum(budgets, "netValueCreation");
    const deltaPct = budgetNvc !== 0 ? ((actualNvc - budgetNvc) / Math.abs(budgetNvc)) * 100 : null;
    if (deltaPct !== null) {
      insights.push({
        text: `Actual Net Value Creation is ${deltaPct >= 0 ? "ahead of" : "behind"} budget by ${formatPct(Math.abs(deltaPct))} (${actualNvc.toFixed(2)} vs ${budgetNvc.toFixed(2)} USD Mn).`,
        tone: deltaPct >= 0 ? "good" : "bad",
      });
    }

    const actualRoi = sum(actuals, "totalCostIncurred") > 0 ? (actualNvc / sum(actuals, "totalCostIncurred")) * 100 : 0;
    const budgetRoi = sum(budgets, "totalCostIncurred") > 0 ? (budgetNvc / sum(budgets, "totalCostIncurred")) * 100 : 0;
    insights.push({
      text: `ROI stands at ${formatPct(actualRoi)} actual vs ${formatPct(budgetRoi)} budgeted — ${
        actualRoi >= 300 ? "within Hackett's 'Good' tier or better" : "below Hackett's 'Good' (300%+) benchmark"
      }.`,
      tone: actualRoi >= 300 ? "good" : "warn",
    });
  }

  // Largest cost component across actual rows
  if (actuals.length) {
    const totals = new Map<string, number>();
    for (const r of actuals) {
      for (const def of COST_COMPONENT_DEFS) {
        totals.set(def.label, (totals.get(def.label) ?? 0) + (r.costComponents[def.key] ?? 0));
      }
    }
    const sorted = [...totals.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [label, value] = sorted[0];
      const totalCost = sum(actuals, "totalCostIncurred");
      const share = totalCost > 0 ? (value / totalCost) * 100 : 0;
      insights.push({
        text: `${label} is the largest cost component at $${value.toFixed(2)}Mn (${formatPct(share)} of total cost incurred).`,
        tone: "neutral",
      });
    }
  }

  // Division breakdown, if the scope includes more than one division (e.g. "All")
  const divisionSet = new Set(actuals.map((r) => r.division));
  if (divisionSet.size > 1) {
    const byDivision = new Map<string, number>();
    for (const r of actuals) {
      if (r.division === "Combine") continue;
      byDivision.set(r.division, (byDivision.get(r.division) ?? 0) + r.netValueCreation);
    }
    const sorted = [...byDivision.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      insights.push({
        text: `${sorted[0][0]} contributes the most Net Value Creation among divisions at $${sorted[0][1].toFixed(2)}Mn.`,
        tone: "good",
      });
    }
  }

  // Trend across periods (chronological by sort within the filtered scope)
  const withFy = actuals.filter((r) => !r.isFy);
  if (withFy.length >= 2) {
    const chronological = [...withFy].sort((a, b) => a.year - b.year || (a.quarter ?? 0) - (b.quarter ?? 0));
    const first = chronological[0];
    const last = chronological[chronological.length - 1];
    if (first.periodLabel !== last.periodLabel) {
      const change = first.netValueCreation !== 0 ? ((last.netValueCreation - first.netValueCreation) / Math.abs(first.netValueCreation)) * 100 : null;
      if (change !== null) {
        insights.push({
          text: `Net Value Creation moved from $${first.netValueCreation.toFixed(2)}Mn (${first.periodLabel}) to $${last.netValueCreation.toFixed(2)}Mn (${last.periodLabel}), a ${change >= 0 ? "gain" : "decline"} of ${formatPct(Math.abs(change))}.`,
          tone: change >= 0 ? "good" : "warn",
        });
      }
    }
  }

  // Revenue ratio, when revenue data exists
  const withRevenue = actuals.filter((r) => r.revenue > 0);
  if (withRevenue.length > 0) {
    const totalNvc = sum(withRevenue, "netValueCreation");
    const totalRevenue = sum(withRevenue, "revenue");
    if (totalRevenue > 0) {
      insights.push({
        text: `Net Value Creation represents ${formatPct((totalNvc / totalRevenue) * 100)} of Revenue across periods with revenue data.`,
        tone: "neutral",
      });
    }
  }

  return insights;
}
