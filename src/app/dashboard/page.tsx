"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { formatMoney, formatPct } from "@/lib/calculations";
import { useFxLive } from "@/hooks/useFxRates";
import { TierBadge } from "@/components/dashboard/TierBadge";

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div data-ui="card" className="overflow-hidden rounded-xl border border-border bg-bg2">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">
        <span>{title}</span>
        <span className="font-normal normal-case text-muted">{sub}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export default function ActualVsTargetPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  if (isLoading) return <p className="text-sm text-muted">Loading P&amp;L data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No data for this scope yet. {division !== "Combine" ? "Try a different division/year, or " : ""}
        ask an admin to upload the procurement database file.
      </p>
    );
  }

  const actualRows = rows.filter((r) => r.recordType === "actual");
  const budgetRows = rows.filter((r) => r.recordType === "budget");

  const table = (list: typeof rows, tone: "actual" | "budget") => (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className={tone === "actual" ? "bg-blueHdr text-white" : "bg-orgHdr text-white"}>
          <th className="min-w-[130px] px-3 py-2 text-left text-[11px] font-bold">{tone === "actual" ? "Actual" : "Target"}</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold">Value Creation</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold">Cost Incurred</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold">Net Value Creation</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold">Value/SUM %</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold">ROI %</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold">Tier</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r) => (
          <tr key={r.id} className="border-b border-border/40 hover:bg-teal/[0.03]">
            <td className="px-3 py-1.5 font-medium text-text">
              {r.division} · {r.periodLabel}
            </td>
            <td className="px-3 py-1.5 text-right font-mono">{formatMoney(r.totalValueCreation, currency, rate)}</td>
            <td className="px-3 py-1.5 text-right font-mono">{formatMoney(r.totalCostIncurred, currency, rate)}</td>
            <td className="px-3 py-1.5 text-right font-mono font-bold text-teal">{formatMoney(r.netValueCreation, currency, rate)}</td>
            <td className="px-3 py-1.5 text-right font-mono">{formatPct(r.valueToSumPct)}</td>
            <td className="px-3 py-1.5 text-right font-mono font-bold text-gold">{formatPct(r.roiPct)}</td>
            <td className="px-3 py-1.5 text-right">
              <TierBadge roiPct={r.roiPct} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-3.5">
      <div className="rounded-lg border border-border bg-bg2 px-4 py-2.5 text-[11px] text-light">
        🏆 <b className="text-text">ROI Tiers</b> (NVC ÷ Cost Incurred — Hackett Group benchmark): World Class ≥900% · Excellent 500–900% · Good 300–500% · Average 100–300% · Below Avg &lt;100%
      </div>
      {actualRows.length > 0 && <Section title="Actual vs Target" sub="[Actual]">{table(actualRows, "actual")}</Section>}
      {budgetRows.length > 0 && <Section title="Actual vs Target" sub="[Target]">{table(budgetRows, "budget")}</Section>}
    </div>
  );
}
