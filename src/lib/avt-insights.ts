import type { PnlRow } from "@/types";
import { convertValue, vsrBenchmarkFor } from "@/lib/calculations";
import { aggregationRows, sumField, moneyLabel } from "@/lib/format";

export interface AvtInsights {
  headline: string;
  bullets: string[];
  periodRange: string;
  periodCount: number;
}

/** Deterministic narrative for the Actual vs Target tab — no AI/API cost. */
export function buildAvtInsights(rows: PnlRow[], division: string, currency: "USD" | "IDR", rate: number): AvtInsights | null {
  const actual = aggregationRows(rows, "actual");
  const target = aggregationRows(rows, "budget");
  if (actual.length === 0) return null;

  const M = (v: number) => moneyLabel(convertValue(v, currency, rate), currency);

  const chronological = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  const periodRange = `${chronological[0].periodLabel} → ${chronological[chronological.length - 1].periodLabel}`;

  const vcActual = sumField(actual, "totalValueCreation");
  const vcTarget = sumField(target, "totalValueCreation");
  const sumActual = sumField(actual, "initialSum");
  const sumTarget = sumField(target, "initialSum");

  const bullets: string[] = [];
  let headline = `${division} value creation for this scope: ${M(vcActual)}.`;

  if (vcTarget !== 0) {
    const multiplier = vcActual / vcTarget;
    const pct = (multiplier - 1) * 100;
    headline = `${division} delivered ${multiplier.toFixed(2)}× of the value creation target across this scope — ${
      pct >= 0 ? "exceeding" : "missing"
    } plan by ${Math.abs(pct).toFixed(1)}%.`;

    const variance = vcActual - vcTarget;
    bullets.push(
      `Value creation aggregated: ${M(vcActual)} actual vs ${M(vcTarget)} target — variance ${M(Math.abs(variance))} (${variance >= 0 ? "favourable" : "unfavourable"}).`
    );
  }

  if (sumTarget !== 0) {
    const overspendPct = ((sumActual - sumTarget) / sumTarget) * 100;
    bullets.push(
      `SUM (initial spend): ${M(sumActual)} actual vs ${M(sumTarget)} target — ${overspendPct >= 0 ? "overspend" : "underspend"} of ${
        overspendPct >= 0 ? "+" : ""
      }${overspendPct.toFixed(2)}%.`
    );
  }

  if (sumActual > 0) {
    const vsrActual = (vcActual / sumActual) * 100;
    const tier = vsrBenchmarkFor(vsrActual);
    if (sumTarget > 0) {
      const vsrTarget = (vcTarget / sumTarget) * 100;
      const gap = vsrActual - vsrTarget;
      bullets.push(
        `Value-to-SUM ratio: ${vsrActual.toFixed(2)}% ${tier.label.toUpperCase()} vs target ${vsrTarget.toFixed(2)}% — gap ${gap >= 0 ? "+" : ""}${gap.toFixed(2)} pts.`
      );
    } else {
      bullets.push(`Value-to-SUM ratio: ${vsrActual.toFixed(2)}% (${tier.label}).`);
    }
  }

  const withRatio = actual.filter((r) => r.initialSum > 0);
  if (withRatio.length > 0) {
    const best = withRatio.reduce((a, b) => (b.valueToSumPct > a.valueToSumPct ? b : a));
    const worst = actual.reduce((a, b) => (b.valueToSumPct < a.valueToSumPct ? b : a));
    bullets.push(`Best period: ${best.periodLabel} at ${best.valueToSumPct.toFixed(2)}%. Weakest: ${worst.periodLabel} at ${worst.valueToSumPct.toFixed(2)}%.`);
  }

  return { headline, bullets, periodRange, periodCount: chronological.length };
}
