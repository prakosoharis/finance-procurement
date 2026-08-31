"use client";

import { useFxRates, useFxLive } from "@/hooks/useFxRates";
import { KpiCard } from "@/components/dashboard/KpiCard";

export default function FxRatesPage() {
  const { data: rates, isLoading } = useFxRates();
  const { data: live, isError: liveError } = useFxLive();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          label="Live BI Rate (USD→IDR)"
          value={liveError ? "unavailable" : live ? `Rp${live.rate.toFixed(0)}` : "..."}
          accent="teal"
        />
        <KpiCard label="Historical Periods" value={String(rates?.length ?? 0)} accent="gold" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading FX history...</p>
      ) : !rates || rates.length === 0 ? (
        <p className="text-sm text-muted">No historical FX rates seeded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg3 text-left text-[11px] uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2 text-right">IDR per USD</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Rate Date</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.periodLabel} className="border-t border-border even:bg-bg2">
                  <td className="px-3 py-2 font-medium text-text">{r.periodLabel}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(r.rateIdrPerUsd).toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted">{r.source}</td>
                  <td className="px-3 py-2 text-muted">{new Date(r.rateDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
