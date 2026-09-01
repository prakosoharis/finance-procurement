import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, roiBenchmarkFor, convertValue } from "@/lib/calculations";
import { aggregationRows, sumField, moneyLabel } from "@/lib/format";

export type InsightTone = "good" | "warn" | "bad" | "neutral";

export interface InsightBullet {
  text: string;
  tone: InsightTone;
}

export interface InsightCard {
  title: string;
  bullets: InsightBullet[];
}

export interface CompanyRoiEntry {
  label: string;
  roiPct: number;
  multiple: number;
  tag: string;
}

/**
 * The four fixed insight cards from the reference dashboard, computed from real
 * aggregated data (quarters when present, FY only as fallback — see aggregationRows).
 * Deterministic: no AI call, no API cost.
 */
export function buildInsightCards(rows: PnlRow[], division: string, currency: "USD" | "IDR", rate: number): InsightCard[] {
  const actual = aggregationRows(rows, "actual");
  const target = aggregationRows(rows, "budget");
  if (actual.length === 0) return [];

  const M = (v: number) => moneyLabel(convertValue(v, currency, rate), currency);

  const nvcA = sumField(actual, "netValueCreation");
  const nvcT = sumField(target, "netValueCreation");
  const spA = sumField(actual, "initialSum");
  const spT = sumField(target, "initialSum");
  const vcA = sumField(actual, "totalValueCreation");
  const vcT = sumField(target, "totalValueCreation");
  const costA = sumField(actual, "totalCostIncurred");
  const caA = sumField(actual, "costAvoidance");
  const salaries = actual.reduce((acc, r) => acc + (r.costComponents.salaries ?? 0), 0);

  const roiA = costA > 0 ? (nvcA / costA) * 100 : 0;
  const chronological = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));

  // ─── Card 1: P&L Performance Summary ───────────────────────────────
  const nvcAchievement = nvcT !== 0 ? (nvcA / nvcT) * 100 : null;
  const card1: InsightCard = { title: "📊 P&L Performance Summary", bullets: [] };
  card1.bullets.push({
    text: nvcT !== 0
      ? `Net Value Creation: ${M(nvcA)} actual vs ${M(nvcT)} target — ${nvcAchievement!.toFixed(0)}% of plan achieved.`
      : `Net Value Creation: ${M(nvcA)} across ${actual.length} period(s).`,
    tone: nvcAchievement === null ? "neutral" : nvcAchievement >= 100 ? "good" : "bad",
  });
  if (spT !== 0) {
    const spDelta = ((spA - spT) / spT) * 100;
    card1.bullets.push({
      text: `Managed spend (SUM): ${M(spA)} actual vs ${M(spT)} target — ${spDelta >= 0 ? "over" : "under"} plan by ${Math.abs(spDelta).toFixed(1)}%.`,
      tone: spDelta <= 0 ? "good" : "warn",
    });
  }
  if (spA > 0) {
    card1.bullets.push({ text: `Value-to-Spend ratio: ${((vcA / spA) * 100).toFixed(2)}% of managed spend converted into value creation.`, tone: "neutral" });
  }
  card1.bullets.push({
    text: `Total cost incurred: ${M(costA)}${costA > 0 ? ` — salaries alone account for ${((salaries / costA) * 100).toFixed(1)}%` : ""}.`,
    tone: "neutral",
  });
  if (nvcAchievement !== null) {
    card1.bullets.push({
      text: nvcAchievement >= 100 ? "✅ Above target — procurement is delivering ahead of plan for this scope." : "⚠️ Below target — value creation is trailing plan for this scope.",
      tone: nvcAchievement >= 100 ? "good" : "bad",
    });
  }

  // ─── Card 2: ROI Analysis ──────────────────────────────────────────
  const withRoi = actual.filter((r) => r.totalCostIncurred > 0);
  const card2: InsightCard = { title: "⚡ ROI Analysis", bullets: [] };
  const tier = roiBenchmarkFor(roiA);
  card2.bullets.push({
    text: `Aggregate ROI: ${roiA.toFixed(0)}% (${(roiA / 100).toFixed(1)}×) — ${tier.label} on the Hackett Group scale.`,
    tone: roiA >= 900 ? "good" : roiA >= 300 ? "neutral" : "warn",
  });
  if (withRoi.length > 0) {
    const best = withRoi.reduce((a, b) => (b.roiPct > a.roiPct ? b : a));
    const worst = withRoi.reduce((a, b) => (b.roiPct < a.roiPct ? b : a));
    card2.bullets.push({ text: `Strongest period: ${best.periodLabel} at ${best.roiPct.toFixed(0)}% (${(best.roiPct / 100).toFixed(1)}×).`, tone: "good" });
    if (worst.periodLabel !== best.periodLabel) {
      card2.bullets.push({
        text: `Weakest period: ${worst.periodLabel} at ${worst.roiPct.toFixed(0)}% (${(worst.roiPct / 100).toFixed(1)}×)${worst.roiPct < 900 ? " — below World Class" : ""}.`,
        tone: worst.roiPct < 900 ? "warn" : "neutral",
      });
    }
  }
  if (spA > 0) {
    card2.bullets.push({ text: `Cost of procurement is ${((costA / spA) * 100).toFixed(3)}% of managed spend — a lean cost base drives the high ROI multiple.`, tone: "neutral" });
  }

  // ─── Card 3: Value Creation Trends ─────────────────────────────────
  const card3: InsightCard = { title: "📈 Value Creation Trends", bullets: [] };
  card3.bullets.push({
    text: vcT !== 0 ? `Total value creation: ${M(vcA)} actual vs ${M(vcT)} target.` : `Total value creation: ${M(vcA)}.`,
    tone: vcT !== 0 && vcA >= vcT ? "good" : vcT !== 0 ? "bad" : "neutral",
  });
  if (vcT !== 0) {
    card3.bullets.push({ text: `VC achievement multiplier: ${(vcA / vcT).toFixed(2)}× of plan.`, tone: vcA >= vcT ? "good" : "bad" });
  }
  // Best period-over-period NVC growth within the scope.
  let bestGrowth: { label: string; pct: number } | null = null;
  for (let i = 1; i < chronological.length; i++) {
    const prev = chronological[i - 1].netValueCreation;
    const cur = chronological[i].netValueCreation;
    if (prev <= 0) continue;
    const pct = ((cur - prev) / prev) * 100;
    if (!bestGrowth || pct > bestGrowth.pct) bestGrowth = { label: chronological[i].periodLabel, pct };
  }
  if (bestGrowth) {
    card3.bullets.push({ text: `Fastest NVC growth: ${bestGrowth.label} at ${bestGrowth.pct >= 0 ? "+" : ""}${bestGrowth.pct.toFixed(1)}% vs the prior period.`, tone: "good" });
  }
  if (vcA > 0 && caA / vcA < 0.01) {
    card3.bullets.push({ text: "Value creation is effectively 100% Cost Saving — Cost Avoidance is not being tracked in this data.", tone: "warn" });
  }

  // ─── Card 4: Spending Efficiency ───────────────────────────────────
  const card4: InsightCard = { title: "💰 Spending Efficiency", bullets: [] };
  if (spT !== 0) {
    const spDelta = ((spA - spT) / spT) * 100;
    card4.bullets.push({
      text: spDelta <= 0 ? `Under budget by ${Math.abs(spDelta).toFixed(1)}% on managed spend.` : `Over budget by ${spDelta.toFixed(1)}% on managed spend.`,
      tone: spDelta <= 0 ? "good" : "warn",
    });
  }
  card4.bullets.push({ text: `Total managed spend: ${M(spA)} across ${actual.length} period(s).`, tone: "neutral" });
  if (spA > 0) {
    // Expressed per 100 units of spend — the raw ratio reads as an unhelpful 0.0xx.
    card4.bullets.push({ text: `Cost efficiency: every 100 of managed spend returned ${((nvcA / spA) * 100).toFixed(2)} in net value.`, tone: "neutral" });
  }
  if (rate > 0) {
    card4.bullets.push({ text: `At the current BI JISDOR rate, Net Value Creation is worth Rp${((nvcA * rate) / 1000).toFixed(1)} Bn.`, tone: "neutral" });
  }

  const largest = COST_COMPONENT_DEFS.map((def) => ({ label: def.label, total: actual.reduce((a, r) => a + (r.costComponents[def.key] ?? 0), 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)[0];
  if (largest && costA > 0) {
    card4.bullets.push({ text: `Largest cost component: ${largest.label} at ${M(largest.total)} (${((largest.total / costA) * 100).toFixed(1)}% of cost incurred).`, tone: "neutral" });
  }

  return [card1, card2, card3, card4].filter((c) => c.bullets.length > 0);
}

/** Per-FY ROI list for the "This Company" benchmark reference column. */
export function buildCompanyRoiList(rows: PnlRow[]): CompanyRoiEntry[] {
  return rows
    .filter((r) => r.recordType === "actual" && r.isFy && r.totalCostIncurred > 0)
    .sort((a, b) => a.year - b.year)
    .map((r) => {
      const multiple = r.roiPct / 100;
      const tag = r.roiPct >= 900 ? "world class 🏆" : r.roiPct >= 500 ? "excellent ✅" : r.roiPct >= 300 ? "good" : r.roiPct >= 100 ? "average" : "developing";
      return { label: r.periodLabel, roiPct: r.roiPct, multiple, tag };
    });
}
