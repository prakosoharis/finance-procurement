"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData, usePnlSummary } from "@/hooks/usePnlData";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatUsdMn, formatPct } from "@/lib/calculations";

export default function ActualVsTargetPage() {
  const { division, year, quarter } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: summary } = usePnlSummary({ division, year, quarter });

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

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Actual NVC" value={formatUsdMn(summary.actual.netValueCreation)} accent="teal" />
          <KpiCard label="Budget NVC" value={formatUsdMn(summary.budget.netValueCreation)} accent="gold" />
          <KpiCard label="Actual ROI" value={formatPct(summary.actual.roiPct)} accent="green" />
          <KpiCard label="Budget ROI" value={formatPct(summary.budget.roiPct)} accent="gold" />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-bg3 text-left text-[11px] uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Division</th>
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Value Creation</th>
              <th className="px-3 py-2 text-right">Cost Incurred</th>
              <th className="px-3 py-2 text-right">Net Value Creation</th>
              <th className="px-3 py-2 text-right">ROI %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border even:bg-bg2">
                <td className="px-3 py-2 font-medium text-text">{r.division}</td>
                <td className="px-3 py-2">{r.periodLabel}</td>
                <td className="px-3 py-2">
                  <span className={r.recordType === "actual" ? "text-teal" : "text-gold"}>{r.recordType}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatUsdMn(r.totalValueCreation)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatUsdMn(r.totalCostIncurred)}</td>
                <td className="px-3 py-2 text-right font-mono text-teal">{formatUsdMn(r.netValueCreation)}</td>
                <td className="px-3 py-2 text-right font-mono text-green">{formatPct(r.roiPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
