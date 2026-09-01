import type { PnlRow } from "@/types";
import { formatMoney, formatPct, vsrBenchmarkFor } from "@/lib/calculations";

export interface AvtInsights {
  headline: string;
  bullets: string[];
  periodRange: string;
  periodCount: number;
}

/** Collapses a year's rows to one representative row per year — the FY row when present
 * (since it already IS the sum of that year's quarters), otherwise the sum of whatever
 * quarters exist. Prevents double-counting when both quarterly and FY rows are in scope. */
function sumPeriods(rows: PnlRow[], recordType: "actual" | "budget"): PnlRow[] {
  const byYear = new Map<number, PnlRow[]>();
  for (const r of rows.filter((r) => r.recordType === recordType)) {
    byYear.set(r.year, [...(byYear.get(r.year) ?? []), r]);
  }
  const result: PnlRow[] = [];
  for (const group of byYear.values()) {
    const fy = group.find((r) => r.isFy);
    result.push(fy ?? { ...group[0], totalValueCreation: 0, initialSum: 0 });
    if (!fy) {
      const quarters = group.filter((r) => !r.isFy);
      const sumField = (key: keyof PnlRow) => quarters.reduce((a, r) => a + Number(r[key] ?? 0), 0);
      result[result.length - 1] = {
        ...quarters[0],
        totalValueCreation: sumField("totalValueCreation"),
        initialSum: sumField("initialSum"),
      };
    }
  }
  return result;
}

/** Deterministic narrative for the Actual vs Target tab — no AI/API cost. */
export function buildAvtInsights(rows: PnlRow[], division: string, currency: "USD" | "IDR", rate: number): AvtInsights | null {
  const actualRaw = rows.filter((r) => r.recordType === "actual");
  if (actualRaw.length === 0) return null;

  const chronological = [...actualRaw].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  const periodRange = `${chronological[0].periodLabel} → ${chronological[chronological.length - 1].periodLabel}`;

  const actualSummed = sumPeriods(rows, "actual");
  const targetSummed = sumPeriods(rows, "budget");
  const sum = (list: PnlRow[], key: keyof PnlRow) => list.reduce((a, r) => a + Number(r[key] ?? 0), 0);

  const vcActual = sum(actualSummed, "totalValueCreation");
  const vcTarget = sum(targetSummed, "totalValueCreation");
  const sumActual = sum(actualSummed, "initialSum");
  const sumTarget = sum(targetSummed, "initialSum");

  const bullets: string[] = [];
  let headline = `${division} value creation for this scope: ${formatMoney(vcActual, currency, rate)}.`;

  if (vcTarget !== 0) {
    const multiplier = vcActual / vcTarget;
    const pct = (multiplier - 1) * 100;
    headline = `${division} delivered ${multiplier.toFixed(2)}× of the value creation target across this scope — ${
      pct >= 0 ? "exceeding" : "missing"
    } plan by ${Math.abs(pct).toFixed(1)}%.`;

    const variance = vcActual - vcTarget;
    bullets.push(
      `Value creation aggregated: ${formatMoney(vcActual, currency, rate)} actual vs ${formatMoney(vcTarget, currency, rate)} target — variance ${formatMoney(
        Math.abs(variance),
        currency,
        rate
      )} (${variance >= 0 ? "favourable" : "unfavourable"}).`
    );
  }

  if (sumTarget !== 0) {
    const overspendPct = ((sumActual - sumTarget) / sumTarget) * 100;
    bullets.push(
      `SUM (initial spend): ${formatMoney(sumActual, currency, rate)} actual vs ${formatMoney(sumTarget, currency, rate)} target — ${
        overspendPct >= 0 ? "overspend" : "underspend"
      } of ${overspendPct >= 0 ? "+" : ""}${overspendPct.toFixed(2)}%.`
    );
  }

  if (sumActual > 0) {
    const vsrActual = (vcActual / sumActual) * 100;
    const tier = vsrBenchmarkFor(vsrActual);
    if (sumTarget > 0) {
      const vsrTarget = (vcTarget / sumTarget) * 100;
      const gap = vsrActual - vsrTarget;
      bullets.push(
        `Value-to-SUM ratio: ${formatPct(vsrActual)} ${tier.label.toUpperCase()} vs target ${formatPct(vsrTarget)} — gap ${gap >= 0 ? "+" : ""}${gap.toFixed(2)} pts.`
      );
    } else {
      bullets.push(`Value-to-SUM ratio: ${formatPct(vsrActual)} (${tier.label}).`);
    }
  }

  const withRatio = actualRaw.filter((r) => r.initialSum > 0);
  if (withRatio.length > 0) {
    const best = withRatio.reduce((a, b) => (b.valueToSumPct > a.valueToSumPct ? b : a));
    const worstCandidates = actualRaw.filter((r) => r.periodLabel !== best.periodLabel);
    const worst = worstCandidates.length > 0 ? worstCandidates.reduce((a, b) => (b.valueToSumPct < a.valueToSumPct ? b : a)) : best;
    bullets.push(`Best period: ${best.periodLabel} at ${(best.valueToSumPct / 100).toFixed(2)}×. Weakest: ${worst.periodLabel} at ${(worst.valueToSumPct / 100).toFixed(2)}×.`);
  }

  return { headline, bullets, periodRange, periodCount: chronological.length };
}
