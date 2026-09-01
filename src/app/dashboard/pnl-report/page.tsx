"use client";

import { useMemo } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { buildReportModel, reportPeriods, type ReportMode } from "@/lib/pnl-report";
import { PnlReportTable } from "@/components/dashboard/PnlReportTable";

const MODES: [ReportMode | "both", string][] = [
  ["actual", "📘 ACTUAL"],
  ["budget", "📙 BUDGET"],
  ["both", "📊 BOTH (Side-by-side)"],
];

export default function PnlReportPage() {
  const { division, year, quarter, currency, pnlRepMode, setPnlRepMode } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const periods = useMemo(() => reportPeriods(rows ?? [], year, quarter), [rows, year, quarter]);

  const models = useMemo(() => {
    if (!rows || periods.length === 0) return [];
    const modes: ReportMode[] = pnlRepMode === "both" ? ["actual", "budget"] : [pnlRepMode];
    return modes.map((m) => buildReportModel(rows, m, division, periods, currency, rate));
  }, [rows, periods, pnlRepMode, division, currency, rate]);

  const scopeLabel = `${division} · ${year === "All" ? "All Years" : year} · ${quarter === "All" ? "All Quarters" : quarter}`;

  if (isLoading) return <p className="text-sm text-muted">Loading report...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div data-ui="card" className="flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-border bg-bg2 px-3.5 py-2.5">
        <div className="flex gap-0.5 rounded-md bg-bg3 p-[3px]">
          {MODES.map(([mode, label]) => (
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              if (models.length === 0) return;
              const { exportReportToPdf } = await import("@/lib/export-report");
              exportReportToPdf(models, scopeLabel);
            }}
            disabled={models.length === 0}
            className="rounded-[7px] border border-purple bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ⬇ Report PDF
          </button>
          <button
            onClick={async () => {
              if (models.length === 0) return;
              const { exportReportToPptx } = await import("@/lib/export-report");
              exportReportToPptx(models, scopeLabel);
            }}
            disabled={models.length === 0}
            className="rounded-[7px] border border-[#c05621] bg-gradient-to-br from-[#c05621] to-[#dd6b20] px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ⬇ Report PPT
          </button>
        </div>
      </div>

      {models.length === 0 ? (
        <p className="text-sm text-muted">No data for this scope yet — pick a different year/period or upload the procurement database file.</p>
      ) : (
        <div className={pnlRepMode === "both" ? "grid grid-cols-1 gap-3.5 xl:grid-cols-2" : ""}>
          {models.map((m) => (
            <PnlReportTable key={m.mode} model={m} compact={pnlRepMode === "both"} />
          ))}
        </div>
      )}
    </div>
  );
}
