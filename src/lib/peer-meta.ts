/** Per-division framing for the Peer Parity engine. */
export interface PeerDivisionMeta {
  code: string;
  icon: string;
  name: string;
  /** Which benchmark bodies this division is compared against. */
  comparedTo: string;
  caveat: string;
}

export const PEER_DIVISIONS: PeerDivisionMeta[] = [
  {
    code: "SMM",
    icon: "⛏️",
    name: "SMM Mining Procurement",
    comparedTo: "vs Hackett · APQC · CAPS (same formula)",
    caveat:
      "Mining peers report procurement value on widely different bases — some count negotiated savings only, others include cost avoidance, demand management and working-capital gains. Our ROI here is strictly Net Value Creation ÷ Total Cost Incurred across the 15 tracked cost components, so a like-for-like reading requires normalising the peer's own definition first.",
  },
  {
    code: "OliveLink",
    icon: "🤝",
    name: "OliveLink Sourcing",
    comparedTo: "vs Hackett · GPO · APQC",
    caveat:
      "Sourcing intermediaries and GPOs typically quote savings as a percentage of spend under management rather than as a return on their own operating cost, and often exclude the buyer-side effort needed to realise those savings. Treat any multiple below as indicative of direction, not a directly comparable ROI.",
  },
  {
    code: "SUN",
    icon: "☀️",
    name: "SUN Energy Procurement",
    comparedTo: "vs Hackett · APQC · CAPS",
    caveat:
      "Energy procurement benchmarks are heavily influenced by commodity price cycles: a favourable market can inflate reported savings without any change in procurement capability. Period-over-period ROI within our own data is a more reliable signal than a cross-company multiple.",
  },
];

export function peerMetaFor(code: string): PeerDivisionMeta {
  return PEER_DIVISIONS.find((d) => d.code === code) ?? PEER_DIVISIONS[0];
}

/** Illustrative NVC growth scenarios used by the 3-year projection panel. */
export const PROJECTION_SCENARIOS = [
  { label: "Conservative", growth: 0.06, tone: "muted" as const },
  { label: "Base Case", growth: 0.15, tone: "teal" as const },
  { label: "Aggressive", growth: 0.28, tone: "green" as const },
];

export interface ProjectionRow {
  label: string;
  growth: number;
  tone: "muted" | "teal" | "green";
  years: { year: number; value: number }[];
  total: number;
}

/** Compounds the latest full-year NVC forward three years under each scenario. */
export function buildProjection(baseNvc: number, baseYear: number): ProjectionRow[] {
  return PROJECTION_SCENARIOS.map((s) => {
    const years: { year: number; value: number }[] = [];
    let running = baseNvc;
    for (let i = 1; i <= 3; i++) {
      running = running * (1 + s.growth);
      years.push({ year: baseYear + i, value: running });
    }
    return { label: s.label, growth: s.growth, tone: s.tone, years, total: years.reduce((a, y) => a + y.value, 0) };
  });
}
