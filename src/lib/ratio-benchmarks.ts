import type { PnlRow } from "@/types";
import type { TierId } from "@/components/dashboard/TierBadge";

export interface RatioSource {
  label: string;
  url: string;
}

export interface RatioDef {
  key: string;
  /** Row label inside the table. */
  label: string;
  /** Short label used in the benchmark legend. */
  legendLabel: string;
  /** Returns the ratio as a percentage, or null when the denominator is missing. */
  value: (r: PnlRow) => number | null;
  tierFor: (pct: number) => TierId;
  /** Five legend pill captions, World Class → Below Avg. */
  legend: string[];
  source: RatioSource;
  /** Highlighted (result-style) rows in the reference. */
  emphasis?: boolean;
}

const pct = (num: number, den: number): number | null => (den > 0 ? (num / den) * 100 : null);

/** Grader for ratios where a *lower* percentage is better (spend intensity). */
function lowerIsBetter(bounds: [number, number, number, number]) {
  return (v: number): TierId => (v < bounds[0] ? "wc" : v < bounds[1] ? "exc" : v < bounds[2] ? "good" : v < bounds[3] ? "avg" : "below");
}

/** Grader for ratios where a *higher* percentage is better (value intensity). */
function higherIsBetter(bounds: [number, number, number, number]) {
  return (v: number): TierId => (v >= bounds[0] ? "wc" : v >= bounds[1] ? "exc" : v >= bounds[2] ? "good" : v >= bounds[3] ? "avg" : "below");
}

const HACKETT: RatioSource = { label: "Hackett Group", url: "https://www.thehackettgroup.com" };
const CAPS: RatioSource = { label: "CAPS Research", url: "https://www.capsresearch.org" };
const ARDENT: RatioSource = { label: "Ardent Partners (CPO Rising)", url: "https://ardentpartners.com" };
const KEARNEY: RatioSource = { label: "A.T. Kearney", url: "https://www.kearney.com" };
const BAIN: RatioSource = { label: "Bain & Company", url: "https://www.bain.com" };

export const RATIO_DEFS: RatioDef[] = [
  {
    key: "sum_rev",
    label: "SUM / Revenue",
    legendLabel: "SUM/Rev",
    value: (r) => pct(r.initialSum, r.revenue),
    tierFor: lowerIsBetter([15, 30, 50, 70]),
    legend: ["World Class <15%", "Excellent 15–30%", "Good 30–50%", "Average 50–70%", "Below >70%"],
    source: HACKETT,
  },
  {
    key: "sum_gp",
    label: "SUM / Gross Profit",
    legendLabel: "SUM/GP",
    value: (r) => pct(r.initialSum, r.grossProfit),
    tierFor: lowerIsBetter([30, 50, 75, 100]),
    legend: ["World Class <30%", "Excellent 30–50%", "Good 50–75%", "Average 75–100%", "Below >100%"],
    source: CAPS,
  },
  {
    key: "vc_rev",
    label: "Value Creation / Revenue",
    legendLabel: "VC/Rev",
    value: (r) => pct(r.totalValueCreation, r.revenue),
    tierFor: higherIsBetter([3, 2, 1, 0.5]),
    legend: ["World Class ≥3%", "Excellent 2–3%", "Good 1–2%", "Average 0.5–1%", "Below <0.5%"],
    source: ARDENT,
  },
  {
    key: "vc_gp",
    label: "Value Creation / Gross Profit",
    legendLabel: "VC/GP",
    value: (r) => pct(r.totalValueCreation, r.grossProfit),
    tierFor: higherIsBetter([8, 5, 3, 1]),
    legend: ["World Class ≥8%", "Excellent 5–8%", "Good 3–5%", "Average 1–3%", "Below <1%"],
    source: KEARNEY,
  },
  {
    key: "nvc_rev",
    label: "Net Value Creation / Revenue",
    legendLabel: "NVC/Rev",
    value: (r) => pct(r.netValueCreation, r.revenue),
    tierFor: higherIsBetter([2.5, 1.5, 0.75, 0.3]),
    legend: ["World Class ≥2.5%", "Excellent 1.5–2.5%", "Good 0.75–1.5%", "Average 0.3–0.75%", "Below <0.3%"],
    source: HACKETT,
    emphasis: true,
  },
  {
    key: "nvc_gp",
    label: "Net Value Creation / Gross Profit",
    legendLabel: "NVC/GP",
    value: (r) => pct(r.netValueCreation, r.grossProfit),
    tierFor: higherIsBetter([7, 4, 2, 1]),
    legend: ["World Class ≥7%", "Excellent 4–7%", "Good 2–4%", "Average 1–2%", "Below <1%"],
    source: BAIN,
    emphasis: true,
  },
];

/** Rank used to pick the strongest / weakest ratio in the auto-insights narrative. */
export const TIER_RANK: Record<TierId, number> = { wc: 5, exc: 4, good: 3, avg: 2, below: 1 };
