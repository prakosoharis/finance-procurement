"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { PnlRoiReportCard } from "@/components/dashboard/PnlRoiReportCard";

export default function PnlReportPage() {
  const { division, year, quarter, currency, pnlRepMode, setPnlRepMode } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  if (isLoading) return <p className="text-sm text-muted">Loading report...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  const filtered = (rows ?? []).filter((r) => pnlRepMode === "both" || r.recordType === pnlRepMode);

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-0.5 rounded-md bg-bg3 p-[3px]">
        {(
          [
            ["actual", "📘 ACTUAL"],
            ["budget", "📙 BUDGET"],
            ["both", "📊 BOTH (Side-by-side)"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setPnlRepMode(mode)}
            className={`rounded px-3.5 py-1.5 text-[11px] font-bold tracking-[0.03em] transition ${
              pnlRepMode === mode ? "bg-gradient-to-br from-[#1e3a8a] to-[#0f2942] text-white shadow" : "text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">No data for this scope yet — pick a specific year/quarter or upload data.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((row) => (
            <PnlRoiReportCard key={row.id} row={row} currency={currency} rate={rate} />
          ))}
        </div>
      )}
    </div>
  );
}
