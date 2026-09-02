import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, roiBenchmarkFor, vsrBenchmarkFor } from "@/lib/calculations";
import { aggregationRows, sumField } from "@/lib/format";

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
 * Deterministic analysis served when the Anthropic API isn't configured or is
 * unreachable — mirrors the reference dashboard's _localAnalysisFallback(): headline
 * ROI with tier, value creation vs target, spending vs target, value/spend tier and the
 * dominant cost driver, all bolded with markdown that the chat bubble renders.
 * Uses the same aggregation as the Insights and P&L tabs, so it is real analysis rather
 * than a placeholder, at zero API cost (tech spec §6.2 "offline fallback").
 */
export function buildOfflineAnalysis(rows: PnlRow[], scope: ChatScope): string {
  const division = scope.division === "Combine" ? "Combine" : (scope.division ?? "Combine");
  const actual = aggregationRows(rows, "actual");
  const target = aggregationRows(rows, "budget");

  if (actual.length === 0) {
    return "📊 No data in the current filter scope. Try widening the Division / Year / Period selectors above.";
  }

  const chronological = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
  const scopeLabel =
    chronological.length > 1 ? `${chronological[0].periodLabel} → ${chronological[chronological.length - 1].periodLabel}` : chronological[0].periodLabel;

  const vc = sumField(actual, "totalValueCreation");
  const vcT = sumField(target, "totalValueCreation");
  const cost = sumField(actual, "totalCostIncurred");
  const nvc = sumField(actual, "netValueCreation");
  const nvcT = sumField(target, "netValueCreation");
  const sp = sumField(actual, "initialSum");
  const spT = sumField(target, "initialSum");

  const roi = cost > 0 ? (nvc / cost) * 100 : 0;
  const vsr = sp > 0 ? (vc / sp) * 100 : 0;
  const nvcVar = nvcT !== 0 ? (nvc / nvcT - 1) * 100 : null;
  const spVar = spT !== 0 ? (sp / spT - 1) * 100 : null;

  // Dominant cost driver across the whole scope.
  let topLabel: string | null = null;
  let topAmt = 0;
  for (const def of COST_COMPONENT_DEFS) {
    const total = actual.reduce((a, r) => a + (r.costComponents[def.key] ?? 0), 0);
    if (total > topAmt) {
      topAmt = total;
      topLabel = def.label;
    }
  }

  const out: string[] = [];
  out.push(`📊 **${division} · ${scopeLabel}**`, "");
  out.push(`**Headline:** NVC ${nvc.toFixed(2)} Mn on cost ${cost.toFixed(3)} Mn → ROI **${roi.toFixed(0)}%** (${(roi / 100).toFixed(1)}×) — ${roiBenchmarkFor(roi).label}.`, "");
  out.push(`**Value Creation:** ${vc.toFixed(2)} Mn actual vs ${vcT.toFixed(2)} Mn target${nvcVar !== null ? ` (NVC variance ${nvcVar >= 0 ? "+" : ""}${nvcVar.toFixed(1)}%)` : ""}.`);
  out.push(`**Spending:** ${sp.toFixed(1)} Mn actual vs ${spT.toFixed(1)} Mn target${spVar !== null ? ` (${spVar >= 0 ? "+" : ""}${spVar.toFixed(1)}%)` : ""}.`);
  out.push(`**Value/Spend:** ${vsr.toFixed(2)}% — ${vsrBenchmarkFor(vsr).label}.`);
  if (topLabel) out.push(`**Top cost driver:** ${topLabel} at ${topAmt.toFixed(2)} Mn (${cost > 0 ? ((topAmt / cost) * 100).toFixed(0) : "0"}% of cost).`);
  out.push("", "💡 Computed locally from your uploaded data. Set ANTHROPIC_API_KEY to enable full conversational analysis.");
  return out.join("\n");
}
