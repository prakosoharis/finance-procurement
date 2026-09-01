"use client";

import type { PnlRow } from "@/types";
import type { Currency } from "@/store/useFilterStore";
import { formatMoney, formatPct } from "@/lib/calculations";
import { VsrTierBadge } from "@/components/dashboard/TierBadge";

export interface PivotRowDef {
  label: string;
  get: (row: PnlRow) => number;
  kind: "money" | "percent" | "tier";
  bold?: boolean;
  indent?: boolean;
}

export interface GapRowDef {
  label: string;
  get: (actual: PnlRow | undefined, target: PnlRow | undefined) => number | null;
  isPercent?: boolean;
}

function Cell({ children, fy, className = "" }: { children: React.ReactNode; fy?: boolean; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-1.5 text-right font-mono text-[11px] ${fy ? "bg-fyCol" : ""} ${className}`}>{children}</td>;
}

export function AvtPivotTable({
  title,
  subtitle,
  unitTag,
  periods,
  getRow,
  actualRows,
  targetRows,
  gapRow,
  currency,
  rate,
}: {
  title: string;
  subtitle: string;
  unitTag: string;
  periods: { label: string; isFy: boolean }[];
  getRow: (period: string, type: "actual" | "budget") => PnlRow | undefined;
  actualRows: PivotRowDef[];
  targetRows: PivotRowDef[];
  gapRow: GapRowDef;
  currency: Currency;
  rate: number;
}) {
  const fmt = (kind: PivotRowDef["kind"], value: number) => (kind === "percent" ? formatPct(value) : formatMoney(value, currency, rate));

  function Section(bannerLabel: string, tone: "actual" | "budget", defs: PivotRowDef[]) {
    return (
      <>
        <tr className={tone === "actual" ? "bg-blueHdr" : "bg-orgHdr"}>
          <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-3 py-1.5 text-[11px] font-bold text-white">{bannerLabel}</td>
          {periods.map((p) => (
            <td key={p.label} className={p.isFy ? "bg-black/10" : ""} />
          ))}
        </tr>
        {defs.map((def) => (
          <tr key={def.label} className="border-b border-border/40">
            <td className={`sticky left-0 z-10 bg-bg2 px-3 py-1.5 text-[11px] ${def.bold ? "font-bold text-teal" : "text-light"} ${def.indent ? "pl-6" : ""}`}>
              {def.label}
            </td>
            {periods.map((p) => {
              const row = getRow(p.label, tone);
              if (!row)
                return (
                  <Cell key={p.label} fy={p.isFy} className="text-muted">
                    —
                  </Cell>
                );
              const value = def.get(row);
              return (
                <Cell key={p.label} fy={p.isFy} className={def.bold ? "font-bold text-text" : "text-text"}>
                  {def.kind === "tier" ? <VsrTierBadge vsrPct={value} /> : fmt(def.kind, value)}
                </Cell>
              );
            })}
          </tr>
        ))}
      </>
    );
  }

  return (
    <div data-ui="card" className="overflow-hidden rounded-xl border border-border bg-bg2">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">
        <span>{title}</span>
        <span className="font-normal normal-case text-muted">{subtitle}</span>
        <span className="ml-auto rounded bg-blueHdr/20 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case text-[#93c5fd]">{unitTag}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0c1524]">
              <th className="sticky left-0 z-10 bg-[#0c1524] px-3 py-2 text-left text-[11px] font-semibold text-light">Period</th>
              {periods.map((p) => (
                <th key={p.label} className={`whitespace-nowrap px-3 py-2 text-right text-[11px] font-semibold ${p.isFy ? "bg-blueHdr/20 text-[#9fc8e8]" : "text-light"}`}>
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Section("Actual", "actual", actualRows)}
            {Section("Target", "budget", targetRows)}
            <tr className="border-t-2 border-gold bg-gapBg">
              <td className="sticky left-0 z-10 bg-gapBg px-3 py-1.5 text-[11px] font-bold text-gold">{gapRow.label}</td>
              {periods.map((p) => {
                const a = getRow(p.label, "actual");
                const t = getRow(p.label, "budget");
                const v = gapRow.get(a, t);
                return (
                  <Cell key={p.label} fy={p.isFy} className={v === null ? "text-muted" : v >= 0 ? "font-bold text-green" : "font-bold text-red"}>
                    {v === null ? "—" : gapRow.isPercent ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : formatMoney(v, currency, rate)}
                  </Cell>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
