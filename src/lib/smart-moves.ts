import type { PnlRow } from "@/types";
import type { PeerRow } from "@/hooks/usePeers";

export interface SmartMove {
  priority: "now" | "quarter" | "year";
  title: string;
  finding: string;
  move: string;
  who: string;
  when: string;
  win: string;
}

const PRIORITY_LABEL: Record<SmartMove["priority"], string> = {
  now: "🔴 DO NOW",
  quarter: "🟡 THIS QUARTER",
  year: "🔵 THIS YEAR",
};

export { PRIORITY_LABEL };

/**
 * Rules engine over real uploaded data — every move only fires when the condition it
 * describes is actually true for this division's numbers, mirroring the reference
 * dashboard's approach but reading live pnl_data instead of a hardcoded dataset.
 */
export function buildSmartMoves(rows: PnlRow[], peers: PeerRow[], division: string): SmartMove[] {
  const moves: SmartMove[] = [];
  const actual = rows.filter((r) => r.recordType === "actual");
  if (actual.length === 0) return moves;

  const fyRows = actual.filter((r) => r.isFy).sort((a, b) => a.year - b.year);
  const latestFy = fyRows[fyRows.length - 1];
  const latest = latestFy ?? [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 0) - (b.quarter ?? 0)).pop();

  // 1. Peer-band positioning (fires whenever peer benchmarks exist for this division)
  if (latest && peers.length > 0 && latest.totalCostIncurred > 0) {
    const ourMultiple = latest.netValueCreation / latest.totalCostIncurred;
    const multiples = peers.map((p) => Number(p.roiMultiple)).sort((a, b) => a - b);
    const median = multiples[Math.floor(multiples.length / 2)];
    const top = multiples[multiples.length - 1];
    if (ourMultiple < median) {
      moves.push({
        priority: "now",
        title: "Close the gap to peer median ROI",
        finding: `${division}'s ROI multiple is ${ourMultiple.toFixed(1)}× (${latest.periodLabel}), below the peer median of ${median.toFixed(1)}× across ${peers.length} benchmark(s).`,
        move: "Review the largest cost components against peer procurement structures and identify 2-3 categories where spend can convert to documented savings.",
        who: "Procurement Lead",
        when: "Next board cycle",
        win: `Closing half the gap would lift ROI toward ${((ourMultiple + median) / 2).toFixed(1)}×.`,
      });
    } else if (ourMultiple >= top) {
      moves.push({
        priority: "year",
        title: "Codify what's driving best-in-class ROI",
        finding: `${division}'s ROI multiple is ${ourMultiple.toFixed(1)}× (${latest.periodLabel}), at or above the strongest benchmark on file (${top.toFixed(1)}×).`,
        move: "Document the specific levers (cost saving categories, avoidance practices) driving this result so they can be replicated in other divisions.",
        who: "CFO / Procurement Lead",
        when: "Next quarterly review",
        win: "A repeatable playbook for the other two divisions.",
      });
    }
  }

  // 2. Zero Cost Avoidance
  const totalCS = actual.reduce((a, r) => a + r.costSaving, 0);
  const totalCA = actual.reduce((a, r) => a + r.costAvoidance, 0);
  if (totalCS > 0 && totalCA < totalCS * 0.01) {
    moves.push({
      priority: "quarter",
      title: "Start tracking Cost Avoidance separately",
      finding: `100% of Value Creation in this scope is Cost Saving ($${totalCS.toFixed(2)}Mn) — Cost Avoidance is effectively $0.`,
      move: "Stand up a simple Cost Avoidance log (price increases declined, contract renewals held flat, etc.) alongside the existing Cost Saving tracker.",
      who: "Procurement Analyst",
      when: "Within this quarter",
      win: "A fuller, more defensible Value Creation number for board reporting.",
    });
  }

  // 3. Salary concentration
  if (latest && latest.totalCostIncurred > 0) {
    const salaries = latest.costComponents.salaries ?? 0;
    const share = salaries / latest.totalCostIncurred;
    if (share > 0.65) {
      moves.push({
        priority: "year",
        title: "Rebalance cost structure away from headcount",
        finding: `Salaries are ${(share * 100).toFixed(0)}% of total cost incurred in ${latest.periodLabel} — a heavily headcount-weighted cost base.`,
        move: "Evaluate reallocating 5-10% of the procurement budget toward tooling/automation that scales value creation without adding headcount.",
        who: "CFO",
        when: "Next annual budget cycle",
        win: "A less headcount-dependent cost structure, improving ROI resilience.",
      });
    }
  }

  // 4. Data anomaly — NVC without cost
  const anomalies = actual.filter((r) => r.netValueCreation > 0 && r.totalCostIncurred < 0.001);
  if (anomalies.length > 0) {
    moves.push({
      priority: "now",
      title: "Reconcile periods with $0 cost incurred",
      finding: `${anomalies.length} period(s) show positive Net Value Creation with essentially $0 Total Cost Incurred (e.g. ${anomalies[0].periodLabel}) — likely a data entry gap rather than a real result.`,
      move: "Reconcile these periods against the general ledger before they're used in board reporting.",
      who: "Procurement Analyst",
      when: "Before next reporting cycle",
      win: "Accurate ROI figures — an uncaught $0-cost period can wildly inflate a headline ROI %.",
    });
  }

  // 5. Cost growth outpacing NVC growth (needs 2+ FY actual rows)
  if (fyRows.length >= 2) {
    const prev = fyRows[fyRows.length - 2];
    const cur = fyRows[fyRows.length - 1];
    const costGrowth = prev.totalCostIncurred > 0 ? ((cur.totalCostIncurred - prev.totalCostIncurred) / prev.totalCostIncurred) * 100 : 0;
    const nvcGrowth = prev.netValueCreation !== 0 ? ((cur.netValueCreation - prev.netValueCreation) / Math.abs(prev.netValueCreation)) * 100 : 0;
    if (costGrowth - nvcGrowth > 25) {
      moves.push({
        priority: "quarter",
        title: "Cost is growing faster than the value it creates",
        finding: `Cost Incurred grew ${costGrowth.toFixed(0)}% from ${prev.periodLabel} to ${cur.periodLabel}, while Net Value Creation grew only ${nvcGrowth.toFixed(0)}% — a ${(costGrowth - nvcGrowth).toFixed(0)}pt gap.`,
        move: "Audit which cost components grew fastest and confirm each is tied to a proportional increase in savings or avoidance.",
        who: "Procurement Lead",
        when: "This quarter",
        win: "Prevents ROI erosion before it shows up in the annual number.",
      });
    }
  }

  // 6. Cost/Revenue efficiency vs Hackett 0.5% benchmark
  if (latest && latest.revenue > 0) {
    const costToRevenue = (latest.totalCostIncurred / latest.revenue) * 100;
    if (costToRevenue < 0.5) {
      moves.push({
        priority: "year",
        title: "Promote Cost/Revenue efficiency as a board metric",
        finding: `Procurement cost is only ${costToRevenue.toFixed(2)}% of Revenue in ${latest.periodLabel} — well inside the Hackett Group 0.5% efficiency benchmark.`,
        move: "Add Cost/Revenue as a second headline metric alongside ROI in board reporting — it's a strong efficiency story on its own.",
        who: "CFO",
        when: "Next board deck",
        win: "A second strong data point for the procurement function's value case.",
      });
    }
  }

  return moves;
}
