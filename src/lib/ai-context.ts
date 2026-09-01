import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, roiBenchmarkFor, vsrBenchmarkFor } from "@/lib/calculations";
import { aggregationRows, sumField } from "@/lib/format";
import { buildPnlInsights } from "@/lib/pnl-insights";

export interface ChatScope {
  division?: string;
  year?: string;
  quarter?: string;
  currency?: string;
}

/**
 * System prompt assembled from the live P&L rows in scope, mirroring the reference
 * dashboard's buildSystemPrompt(): the model may only cite figures listed here.
 */
export function buildSystemPrompt(rows: PnlRow[], scope: ChatScope): string {
  const divisions = [...new Set(rows.map((r) => r.division))];

  const dataLines = rows
    .slice()
    .sort((a, b) => a.division.localeCompare(b.division) || a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5))
    .map(
      (r) =>
        `${r.division} ${r.periodLabel} [${r.recordType}]: VC=$${r.totalValueCreation.toFixed(2)}Mn Cost=$${r.totalCostIncurred.toFixed(2)}Mn NVC=$${r.netValueCreation.toFixed(
          2
        )}Mn InitSUM=$${r.initialSum.toFixed(2)}Mn ROI=${r.roiPct.toFixed(1)}% Value/SUM=${r.valueToSumPct.toFixed(2)}%${r.revenue > 0 ? ` Revenue=$${r.revenue.toFixed(2)}Mn` : ""}`
    )
    .join("\n");

  return [
    "You are the Procurement Analytics AI assistant for Berau Coal Energy, briefing CFO-level stakeholders.",
    "You have access ONLY to the data below — never reference a division, period or figure that is not listed here. If something isn't in the data, say so plainly.",
    "",
    `AVAILABLE DIVISIONS: ${divisions.length > 0 ? divisions.join(", ") : "(none — no data loaded)"}`,
    "",
    "DATA (all money figures in USD Millions):",
    dataLines || "(no rows in the current scope)",
    "",
    `COST STRUCTURE — the 15 tracked components: ${COST_COMPONENT_DEFS.map((c) => c.label).join(", ")}.`,
    "",
    "DEFINITIONS:",
    "- Net Value Creation (NVC) = Total Value Creation − Total Cost Incurred",
    "- Total Value Creation = Cost Saving + Cost Avoidance",
    "- ROI % = NVC ÷ Total Cost Incurred × 100 (multiplier × = ROI% ÷ 100)",
    "- Value-to-SUM % = Total Value Creation ÷ Initial SUM × 100",
    "- ROI tiers (Hackett Group): World Class ≥900%, Excellent 500–900%, Good 300–500%, Average 100–300%, Below <100%",
    "- Value-to-SUM tiers (Ardent Partners / CAPS / Bain): World Class ≥6%, Excellent 4–6%, Good 2–4%, Average 1–2%, Below <1%",
    "",
    `CURRENT VIEW: division=${scope.division ?? "All"}, year=${scope.year ?? "All"}, period=${scope.quarter ?? "All"}, currency=${scope.currency ?? "USD"}.`,
    "",
    "Be concise (100–160 words), lead with the specific numbers from the data above, use short line breaks rather than long paragraphs, and never invent divisions or periods.",
  ].join("\n");
}

/**
 * Deterministic analysis served when ANTHROPIC_API_KEY isn't configured — the same
 * aggregation the Insights and P&L tabs use, so the answer is real analysis rather than
 * a placeholder. Zero API cost (tech spec §6.2 "offline fallback").
 */
export function buildOfflineAnalysis(rows: PnlRow[], scope: ChatScope): string {
  if (rows.length === 0) {
    return "No P&L data is loaded for the current filter scope yet. Ask an admin to upload the procurement database file, or widen the division/year filter.";
  }

  const division = scope.division ?? "Combine";
  const insights = buildPnlInsights(rows, division, "USD", 0);
  const actual = aggregationRows(rows, "actual");
  const target = aggregationRows(rows, "budget");

  const lines: string[] = [];
  if (insights) {
    lines.push(insights.headline, "");
    lines.push(...insights.bullets.map((b) => `• ${b}`));
  }

  // Value-to-SUM tier, which the P&L insight bullets don't cover.
  const vc = sumField(actual, "totalValueCreation");
  const sum = sumField(actual, "initialSum");
  if (sum > 0) {
    const vsr = (vc / sum) * 100;
    lines.push(`• Value-to-SUM: ${vsr.toFixed(2)}% (${vsrBenchmarkFor(vsr).label}).`);
  }

  // Spending vs plan.
  const spA = sumField(actual, "initialSum");
  const spT = sumField(target, "initialSum");
  if (spT > 0) {
    const delta = ((spA - spT) / spT) * 100;
    lines.push(`• Managed spend is ${delta >= 0 ? "over" : "under"} plan by ${Math.abs(delta).toFixed(1)}%.`);
  }

  const cost = sumField(actual, "totalCostIncurred");
  const nvc = sumField(actual, "netValueCreation");
  if (cost > 0) {
    const roi = (nvc / cost) * 100;
    lines.push(`• Hackett tier for this scope: ${roiBenchmarkFor(roi).label}.`);
  }

  lines.push("", "💡 This is a deterministic summary computed from your data. Set ANTHROPIC_API_KEY to enable full conversational analysis.");
  return lines.join("\n");
}
