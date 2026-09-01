import { roiBenchmarkFor } from "@/lib/calculations";

const TIER_CLASS: Record<string, string> = {
  green: "bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white shadow-sm",
  teal: "bg-green/[0.18] text-green border border-green/40",
  gold: "bg-teal/[0.15] text-teal border border-teal/30",
  muted: "bg-gold/[0.15] text-gold border border-gold/30",
  red: "bg-red/[0.15] text-red border border-red/30",
};

export function TierBadge({ roiPct }: { roiPct: number }) {
  const tier = roiBenchmarkFor(roiPct);
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[11px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${TIER_CLASS[tier.color]}`}>
      {tier.label}
    </span>
  );
}
