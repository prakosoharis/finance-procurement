"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { formatPct, formatMoney } from "@/lib/calculations";
import { useFxLive } from "@/hooks/useFxRates";

export default function RatiosPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  if (isLoading) return <p className="text-sm text-muted">Loading ratio data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  const withRevenue = (rows ?? []).filter((r) => r.revenue > 0 || r.grossProfit !== 0);
  if (withRevenue.length === 0) {
    return <p className="text-sm text-muted">No Revenue/GP data uploaded for this scope yet — this ratio only applies to periods where the source file included Revenue and GP figures.</p>;
  }

  return (
    <div data-ui="card" className="overflow-hidden rounded-xl border border-border bg-bg2">
      <div className="flex items-center gap-2.5 border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">
        <span>Ratio to Revenue &amp; GP</span>
        <span className="sub font-normal normal-case text-muted">[NVC and Cost as a share of company Revenue / Gross Profit]</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0c1524] text-light">
              <th className="px-2.5 py-2 text-left font-semibold">Division / Period</th>
              <th className="px-2.5 py-2 text-left font-semibold">Type</th>
              <th className="px-2.5 py-2 text-right font-medium">Revenue</th>
              <th className="px-2.5 py-2 text-right font-medium">Gross Profit</th>
              <th className="px-2.5 py-2 text-right font-bold text-teal">NVC / Revenue</th>
              <th className="px-2.5 py-2 text-right font-bold text-teal">Cost / Revenue</th>
              <th className="px-2.5 py-2 text-right font-bold text-gold">NVC / GP</th>
            </tr>
          </thead>
          <tbody>
            {withRevenue.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-teal/[0.03]">
                <td className="px-2.5 py-1.5 font-medium text-text">
                  {r.division} · {r.periodLabel}
                </td>
                <td className={`px-2.5 py-1.5 font-semibold ${r.recordType === "actual" ? "text-teal" : "text-gold"}`}>
                  {r.recordType === "actual" ? "Actual" : "Budget"}
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono text-muted">{formatMoney(r.revenue, currency, rate)}</td>
                <td className="px-2.5 py-1.5 text-right font-mono text-muted">{formatMoney(r.grossProfit, currency, rate)}</td>
                <td className="px-2.5 py-1.5 text-right font-mono font-bold text-teal">{r.revenue > 0 ? formatPct((r.netValueCreation / r.revenue) * 100) : "—"}</td>
                <td className="px-2.5 py-1.5 text-right font-mono text-text">{r.revenue > 0 ? formatPct((r.totalCostIncurred / r.revenue) * 100) : "—"}</td>
                <td className="px-2.5 py-1.5 text-right font-mono font-bold text-gold">{r.grossProfit !== 0 ? formatPct((r.netValueCreation / r.grossProfit) * 100) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
