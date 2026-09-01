import { roiBenchmarkFor, vsrBenchmarkFor } from "@/lib/calculations";

/** Shared 5-band benchmark grading used by ROI, Value-to-SUM and the revenue ratios. */
export type TierId = "wc" | "exc" | "good" | "avg" | "below";

export const TIER_LABEL: Record<TierId, string> = {
  wc: "World Class",
  exc: "Excellent",
  good: "Good",
  avg: "Average",
  below: "Below Avg",
};

export const TIER_CLASS: Record<TierId, string> = {
  wc: "bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white shadow-sm",
  exc: "bg-green/[0.18] text-green border border-green/40",
  good: "bg-teal/[0.15] text-teal border border-teal/30",
  avg: "bg-gold/[0.15] text-gold border border-gold/30",
  below: "bg-red/[0.15] text-red border border-red/30",
};

/** Text colour for a value graded by tier (used inline in table cells). */
export const TIER_TEXT: Record<TierId, string> = {
  wc: "text-gold",
  exc: "text-green",
  good: "text-teal",
  avg: "text-light",
  below: "text-red",
};

/** The benchmark tables in calculations.ts grade by colour name; map those onto tier ids. */
const COLOR_TO_TIER: Record<string, TierId> = { green: "wc", teal: "exc", gold: "good", muted: "avg", red: "below" };

export function TierPill({ tier, compact = false }: { tier: TierId; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-[11px] font-bold uppercase tracking-[0.04em] ${TIER_CLASS[tier]} ${
        compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

/** Hackett Group ROI tier (NVC ÷ Total Cost Incurred). */
export function TierBadge({ roiPct }: { roiPct: number }) {
  return <TierPill tier={COLOR_TO_TIER[roiBenchmarkFor(roiPct).color]} />;
}

/** Ardent Partners / CAPS / Bain Value-to-SUM tier (Value Creation ÷ Initial SUM). */
export function VsrTierBadge({ vsrPct }: { vsrPct: number }) {
  return <TierPill tier={COLOR_TO_TIER[vsrBenchmarkFor(vsrPct).color]} />;
}
