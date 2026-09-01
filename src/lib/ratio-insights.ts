import type { PnlRow } from "@/types";
import { convertValue } from "@/lib/calculations";
import { aggregationRows, sumField, moneyLabel } from "@/lib/format";
import { RATIO_DEFS, TIER_RANK } from "@/lib/ratio-benchmarks";
import { TIER_LABEL } from "@/components/dashboard/TierBadge";
import type { AvtInsights } from "@/lib/avt-insights";

/** Deterministic narrative for the "Ratio to Revenue & GP" tab. */
export function buildRatioInsights(rows: PnlRow[], division: string, currency: "USD" | "IDR", rate: number): AvtInsights | null {
  // Only periods that actually carry Revenue/GP can support these ratios.
  const actual = aggregationRows(rows, "actual").filter((r) => r.revenue > 0 || r.grossProfit > 0);
  if (actual.length === 0) return null;

  const M = (v: number) => moneyLabel(convertValue(v, currency, rate), currency);
  const chronological = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  const periodRange = `${chronological[0].periodLabel} → ${chronological[chronological.length - 1].periodLabel}`;

  const rev = sumField(actual, "revenue");
  const gp = sumField(actual, "grossProfit");
  const vc = sumField(actual, "totalValueCreation");
  const nvc = sumField(actual, "netValueCreation");
  const sum = sumField(actual, "initialSum");

  // Grade each ratio off the aggregate rather than averaging per-period percentages.
  const aggregate: PnlRow = { ...actual[0], revenue: rev, grossProfit: gp, totalValueCreation: vc, netValueCreation: nvc, initialSum: sum };
  const graded = RATIO_DEFS.map((def) => {
    const value = def.value(aggregate);
    return value === null ? null : { def, value, tier: def.tierFor(value) };
  }).filter((g): g is NonNullable<typeof g> => g !== null);

  const gpMargin = rev > 0 ? (gp / rev) * 100 : null;
  const headline = `${division} generated ${M(vc)} value creation and ${M(nvc)} net value on ${M(rev)} revenue${
    gpMargin !== null ? ` (GP margin ${gpMargin.toFixed(1)}%)` : ""
  }, with ${M(sum)} managed spend flowing through procurement.`;

  const bullets: string[] = [];
  const byKey = new Map(graded.map((g) => [g.def.key, g]));
  const pair = (a: string, b: string, prefix: string) => {
    const ga = byKey.get(a);
    const gb = byKey.get(b);
    if (!ga && !gb) return;
    const parts = [ga && `${ga.value.toFixed(2)}% of revenue (${TIER_LABEL[ga.tier]})`, gb && `${gb.value.toFixed(2)}% of gross profit (${TIER_LABEL[gb.tier]})`].filter(Boolean);
    bullets.push(`${prefix}: ${parts.join(" · ")}.`);
  };

  pair("sum_rev", "sum_gp", "Spend intensity — managed SUM is");
  pair("vc_rev", "vc_gp", "Value intensity — value creation is");
  pair("nvc_rev", "nvc_gp", "Net value intensity — NVC is");

  if (graded.length >= 2) {
    const sorted = [...graded].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    bullets.push(
      `Strongest ratio: ${strongest.def.legendLabel} at ${strongest.value.toFixed(2)}% (${TIER_LABEL[strongest.tier]}). Weakest: ${weakest.def.legendLabel} at ${weakest.value.toFixed(
        2
      )}% (${TIER_LABEL[weakest.tier]}) — the clearest place to move up a tier.`
    );
  }

  return { headline, bullets, periodRange, periodCount: chronological.length };
}
