import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, roiBenchmarkFor, convertValue } from "@/lib/calculations";
import { aggregationRows, sumField, moneyLabel } from "@/lib/format";
import type { AvtInsights } from "@/lib/avt-insights";

/** Deterministic narrative for the "P&L + ROI" tab — mirrors the reference's buildPnlInsights(). */
export function buildPnlInsights(rows: PnlRow[], division: string, currency: "USD" | "IDR", rate: number): AvtInsights | null {
  const actual = aggregationRows(rows, "actual");
  const target = aggregationRows(rows, "budget");
  if (actual.length === 0) return null;

  const M = (v: number) => moneyLabel(convertValue(v, currency, rate), currency);

  const chronological = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  const periodRange = `${chronological[0].periodLabel} → ${chronological[chronological.length - 1].periodLabel}`;

  const vc = sumField(actual, "totalValueCreation");
  const cs = sumField(actual, "costSaving");
  const ca = sumField(actual, "costAvoidance");
  const cost = sumField(actual, "totalCostIncurred");
  const nvc = sumField(actual, "netValueCreation");
  const sum = sumField(actual, "initialSum");
  const roi = cost > 0 ? (nvc / cost) * 100 : 0;
  const tier = roiBenchmarkFor(roi);

  const headline = `${division} generated ${M(nvc)} net value creation on ${M(cost)} operating cost — ROI ${roi.toFixed(0)}% (${(roi / 100).toFixed(1)}×) ${tier.label.toUpperCase()}.`;

  const bullets: string[] = [
    `Total value creation: ${M(vc)} (Cost Saving ${M(cs)} + Cost Avoidance ${M(ca)}) — cost incurred ${M(cost)} → NVC ${M(nvc)}.`,
  ];

  // Dominant cost driver across the 15 components.
  const componentTotals = COST_COMPONENT_DEFS.map((def) => ({
    label: def.label,
    total: actual.reduce((acc, r) => acc + (r.costComponents[def.key] ?? 0), 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  if (componentTotals.length > 0 && cost > 0) {
    const top = componentTotals[0];
    bullets.push(`Dominant cost driver: ${top.label} at ${M(top.total)} — ${((top.total / cost) * 100).toFixed(1)}% of total operating cost.`);
  }

  if (target.length > 0) {
    const nvcT = sumField(target, "netValueCreation");
    const costT = sumField(target, "totalCostIncurred");
    const roiT = costT > 0 ? (nvcT / costT) * 100 : 0;
    if (nvcT !== 0) {
      const variancePct = ((nvc - nvcT) / Math.abs(nvcT)) * 100;
      bullets.push(
        `vs Target: NVC actual ${M(nvc)} vs plan ${M(nvcT)} — variance ${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}%, ROI gap ${
          roi - roiT >= 0 ? "+" : ""
        }${(roi - roiT).toFixed(0)} pts.`
      );
    }
  }

  if (sum > 0) {
    const efficiency = (cost / sum) * 100;
    bullets.push(
      `Cost-of-procurement efficiency: ${efficiency.toFixed(3)}% of managed SUM — every $100 managed spend costs $${(efficiency).toFixed(2)} to run.`
    );
  }

  return { headline, bullets, periodRange, periodCount: chronological.length };
}
