"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { COST_COMPONENT_DEFS } from "@/lib/calculations";
import { formatMoney, formatPct } from "@/lib/calculations";
import { useFxLive } from "@/hooks/useFxRates";

export default function PnlRoiPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  if (isLoading) return <p className="text-sm text-muted">Loading P&amp;L data...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (!rows || rows.length === 0) return <p className="text-sm text-muted">No data for this scope yet.</p>;

  return (
    <div data-ui="card" className="overflow-hidden rounded-xl border border-border bg-bg2">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">
        <span>Full P&amp;L — Net Value Creation with ROI</span>
        <span className="ml-auto rounded bg-blueHdr/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#93c5fd]">
          {currency === "USD" ? "USD Mn" : "IDR Bn"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0c1524] text-light">
              <th className="min-w-[130px] px-2.5 py-2 text-left font-semibold">Division / Period</th>
              <th className="px-2.5 py-2 text-left font-semibold">Type</th>
              {COST_COMPONENT_DEFS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-2.5 py-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-2.5 py-2 text-right font-bold text-teal">Total Cost</th>
              <th className="whitespace-nowrap px-2.5 py-2 text-right font-bold text-teal">NVC</th>
              <th className="whitespace-nowrap px-2.5 py-2 text-right font-bold text-gold">ROI %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-teal/[0.03]">
                <td className="px-2.5 py-1.5 font-medium text-text">
                  {r.division} · {r.periodLabel}
                </td>
                <td className={`px-2.5 py-1.5 font-semibold ${r.recordType === "actual" ? "text-teal" : "text-gold"}`}>
                  {r.recordType === "actual" ? "Actual" : "Budget"}
                </td>
                {COST_COMPONENT_DEFS.map((c) => (
                  <td key={c.key} className="px-2.5 py-1.5 text-right font-mono text-muted">
                    {formatMoney(r.costComponents[c.key] ?? 0, currency, rate)}
                  </td>
                ))}
                <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-text">{formatMoney(r.totalCostIncurred, currency, rate)}</td>
                <td className="px-2.5 py-1.5 text-right font-mono font-bold text-teal">{formatMoney(r.netValueCreation, currency, rate)}</td>
                <td className="px-2.5 py-1.5 text-right font-mono font-bold text-gold">{formatPct(r.roiPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
