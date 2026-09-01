"use client";

import { type ReportModel, reportFmt, reportPct } from "@/lib/pnl-report";

/**
 * The board-report rendering of the P&L: a white, print-styled table with periods as
 * columns. Deliberately keeps its own light palette regardless of the active dashboard
 * theme — it is meant to look the same on screen as it does exported to PDF/PPT.
 */
export function PnlReportTable({ model, compact = false }: { model: ReportModel; compact?: boolean }) {
  const isActual = model.mode === "actual";
  const pad = compact ? "px-2 py-[4.5px]" : "px-3 py-[5.5px]";
  const fontSize = compact ? "text-[11px]" : "text-[12px]";

  return (
    <div className="overflow-x-auto rounded-md border border-slate-300 bg-white shadow-md">
      <div className={`px-3.5 py-2 text-center font-bold tracking-[0.02em] text-white ${compact ? "text-[13px]" : "text-[15px]"} ${isActual ? "bg-gradient-to-r from-[#0f2942] via-[#1e3a8a] to-[#0f2942]" : "bg-gradient-to-r from-[#7c2d12] via-[#c2410c] to-[#7c2d12]"}`}>
        {model.title}
      </div>

      <div className="px-3.5 pb-1.5 pt-2.5">
        <span className={`inline-block rounded-[2px] px-4 py-1 font-bold tracking-[0.02em] ${compact ? "text-[11px]" : "text-[12px]"} ${isActual ? "bg-[#fbbf24] text-black" : "bg-[#f97316] text-white"}`}>
          {model.divisionTag}
        </span>
      </div>

      <table className={`w-full border-collapse font-sans ${fontSize} text-slate-800`}>
        <tbody>
          {model.lines.map((line, i) => {
            if (line.style === "spacer") {
              return (
                <tr key={`sp-${i}`}>
                  <td colSpan={model.periods.length + 1} className="h-2 bg-white" />
                </tr>
              );
            }

            if (line.style === "section") {
              return (
                <tr key={`sec-${i}`}>
                  <td colSpan={model.periods.length + 1} className={`border-b-2 border-[#0f2942] bg-[#0f2942] font-bold text-white ${pad} ${compact ? "text-[12px]" : "text-[12.5px]"}`}>
                    {line.label}
                  </td>
                </tr>
              );
            }

            if (line.style === "periods") {
              return (
                <tr key={`per-${i}`}>
                  <td className={`border-b-[1.5px] border-slate-300 bg-white ${pad}`} />
                  {model.periods.map((p) => (
                    <td key={p} className={`border-b-[1.5px] border-slate-300 bg-white text-right font-semibold text-slate-600 ${pad} ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
                      {p}
                    </td>
                  ))}
                </tr>
              );
            }

            const isPercent = line.style === "ratio";
            const rowBg =
              line.style === "net"
                ? "bg-[#7dd3fc] text-[#0c4a6e] font-bold border-y-2 border-[#0284c7]"
                : line.style === "sumInit"
                  ? "bg-[#fdba74] text-[#7c2d12] font-bold border-t-[1.5px] border-[#c2410c]"
                  : line.style === "sumAfter"
                    ? "bg-[#fdba74] text-[#7c2d12] font-bold border-b-[1.5px] border-[#c2410c]"
                    : line.style === "ratio"
                      ? "bg-[#7dd3fc] text-[#0c4a6e] font-bold border-y-2 border-[#0284c7]"
                      : line.style === "category"
                        ? "bg-white font-bold text-slate-900 border-b border-slate-200"
                        : "bg-white text-slate-600 border-b border-slate-100";

            return (
              <tr key={`${line.label}-${i}`} className={rowBg}>
                <td className={`text-left ${pad} ${line.style === "sub" ? (compact ? "pl-5" : "pl-6") : ""} ${compact ? "min-w-[150px]" : "min-w-[210px]"}`}>{line.label}</td>
                {model.periods.map((p, ci) => {
                  const v = line.values[ci] ?? null;
                  return (
                    <td key={p} className={`text-right tabular-nums ${pad} ${v === null ? "text-slate-400" : ""}`}>
                      {isPercent ? reportPct(v) : reportFmt(v)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
