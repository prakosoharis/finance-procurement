"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { PnlRoiReportCard } from "@/components/dashboard/PnlRoiReportCard";

export default function PnlReportPage() {
  const { division, year, quarter, pnlRepMode, setPnlRepMode } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });

  if (isLoading) return <p className="text-sm text-muted">Loading report...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  const filtered = (rows ?? []).filter((r) => pnlRepMode === "both" || r.recordType === pnlRepMode);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["actual", "budget", "both"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setPnlRepMode(mode)}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              pnlRepMode === mode ? "bg-teal text-bg" : "border border-border text-muted"
            }`}
          >
            {mode[0].toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">No data for this scope yet — pick a specific year/quarter or upload data.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((row) => (
            <PnlRoiReportCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
