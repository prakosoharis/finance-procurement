"use client";

import { Fragment, useState } from "react";
import { fmtNum } from "@/lib/format";
import { TierBadge, VsrTierBadge, TierPill, TIER_TEXT, type TierId } from "@/components/dashboard/TierBadge";

export interface PivotPeriod {
  label: string;
  isFy: boolean;
}

export type PivotRow =
  /** Section banner: blue for Actual, orange for Target, green for Variance. */
  | { kind: "banner"; label: string; tone: "actual" | "target" | "variance" }
  | { kind: "spacer"; key: string }
  /** Ordinary numeric row. `values` must align 1:1 with the `periods` array. */
  | {
      kind: "data";
      label: string;
      values: (number | null)[];
      sub?: boolean;
      decimals?: number;
      suffix?: string;
      /** Visual weight: plain body row, cyan "result" row, or gold ROI row. */
      tone?: "plain" | "result" | "roi";
      /** Color positive green / negative red (used for variance rows). */
      signed?: boolean;
      /** Grade the value against a benchmark: colours the number, and shows a compact
       *  pill on full-year columns only (quarterly columns stay narrow). */
      tierFor?: (v: number) => TierId;
    }
  /** Row of benchmark tier badges. */
  | { kind: "tier"; label: string; values: (number | null)[]; scale: "roi" | "vsr"; sub?: boolean }
  /** Collapsible total whose children are revealed on click. */
  | {
      kind: "expandable";
      label: string;
      values: (number | null)[];
      decimals?: number;
      children: { label: string; values: (number | null)[] }[];
    };

const BANNER_CLASS: Record<string, string> = {
  actual: "bg-blueHdr text-white",
  target: "bg-orgHdr text-white",
  variance: "bg-gapBg text-green border-y border-gapBdr",
};

function Cell({ children, isFy, className = "" }: { children: React.ReactNode; isFy: boolean; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-1.5 text-right font-mono text-[11px] ${isFy ? "bg-fyCol" : ""} ${className}`}>{children}</td>;
}

export function PivotTable({
  title,
  subtitle,
  unitTag,
  legend,
  periods,
  rows,
}: {
  title: string;
  subtitle?: string;
  unitTag: string;
  legend?: React.ReactNode;
  periods: PivotPeriod[];
  rows: PivotRow[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const colSpan = periods.length + 1;

  function renderValue(
    value: number | null,
    decimals: number,
    suffix: string,
    signed: boolean
  ): { text: string; className: string } {
    if (value === null) return { text: "—", className: "text-muted" };
    const text = suffix === "%" || suffix === "×" ? `${value.toFixed(decimals)}${suffix}` : fmtNum(value, decimals);
    const className = signed ? (value >= 0 ? "text-green" : "text-red") : "";
    return { text, className };
  }

  return (
    <div data-ui="card" className="overflow-hidden rounded-xl border border-border bg-bg2">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">
        <span>{title}</span>
        {subtitle && <span className="font-normal normal-case text-muted">{subtitle}</span>}
        <span className="ml-auto rounded bg-blueHdr/20 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case text-[#93c5fd]">{unitTag}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {legend && (
            <thead>
              <tr>
                <td colSpan={colSpan} className="border-b border-border bg-bg3/50 px-4 py-2">
                  {legend}
                </td>
              </tr>
            </thead>
          )}
          <tbody>
            <tr className="bg-[#0c1524]">
              <td className="sticky left-0 z-10 min-w-[210px] bg-[#0c1524] px-3 py-2 text-left text-[11px] font-semibold text-light" />
              {periods.map((p) => (
                <td
                  key={p.label}
                  className={`whitespace-nowrap px-3 py-2 text-right text-[11px] font-semibold italic ${p.isFy ? "bg-[#0b1e36] text-[#9fc8e8]" : "text-light"}`}
                >
                  {p.label}
                </td>
              ))}
            </tr>

            {rows.map((row, i) => {
              if (row.kind === "spacer") {
                return (
                  <tr key={row.key}>
                    <td colSpan={colSpan} className="h-2.5 bg-bg2" />
                  </tr>
                );
              }

              if (row.kind === "banner") {
                return (
                  <tr key={`${row.label}-${i}`} className={BANNER_CLASS[row.tone]}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-3 py-2 text-[12px] font-bold">{row.label}</td>
                    {periods.map((p) => (
                      <td key={p.label} className={p.isFy ? "bg-black/15" : ""} />
                    ))}
                  </tr>
                );
              }

              if (row.kind === "tier") {
                return (
                  <tr key={`${row.label}-${i}`} className="border-b border-border/40">
                    <td className={`sticky left-0 z-10 bg-bg2 px-3 py-1.5 text-[11px] text-muted ${row.sub ? "pl-6" : ""}`}>{row.label}</td>
                    {periods.map((p, ci) => {
                      const v = row.values[ci];
                      return (
                        <Cell key={p.label} isFy={p.isFy}>
                          {v === null ? <span className="text-muted">—</span> : row.scale === "roi" ? <TierBadge roiPct={v} /> : <VsrTierBadge vsrPct={v} />}
                        </Cell>
                      );
                    })}
                  </tr>
                );
              }

              if (row.kind === "expandable") {
                const isOpen = expanded[row.label] ?? false;
                const decimals = row.decimals ?? 2;
                return (
                  <Fragment key={`${row.label}-${i}`}>
                    <tr className="cursor-pointer border-b border-border/40 hover:bg-teal/[0.03]" onClick={() => setExpanded((e) => ({ ...e, [row.label]: !isOpen }))}>
                      <td className="sticky left-0 z-10 bg-bg2 px-3 py-1.5 text-[11px] font-bold text-teal">
                        {isOpen ? "▼" : "▶"} {row.label}
                      </td>
                      {periods.map((p, ci) => {
                        const { text } = renderValue(row.values[ci], decimals, "", false);
                        return (
                          <Cell key={p.label} isFy={p.isFy} className="font-bold text-text">
                            {text}
                          </Cell>
                        );
                      })}
                    </tr>
                    {isOpen &&
                      row.children.map((child) => (
                        <tr key={`${row.label}-${child.label}`} className="border-b border-border/40">
                          <td className="sticky left-0 z-10 bg-bg2 py-1.5 pl-6 pr-3 text-[11px] text-muted">— {child.label}</td>
                          {periods.map((p, ci) => {
                            const { text } = renderValue(child.values[ci], decimals, "", false);
                            return (
                              <Cell key={p.label} isFy={p.isFy} className="text-light">
                                {text}
                              </Cell>
                            );
                          })}
                        </tr>
                      ))}
                  </Fragment>
                );
              }

              // kind === "data"
              const decimals = row.decimals ?? 2;
              const suffix = row.suffix ?? "";
              const tone = row.tone ?? "plain";
              const rowClass =
                tone === "result"
                  ? "bg-teal/[0.04] font-bold"
                  : tone === "roi"
                    ? "bg-gold/[0.05] font-bold"
                    : "";
              const labelClass = tone === "result" ? "text-teal" : tone === "roi" ? "text-gold" : row.sub ? "text-muted" : "text-light";

              return (
                <tr key={`${row.label}-${i}`} className={`border-b border-border/40 ${rowClass}`}>
                  <td className={`sticky left-0 z-10 bg-inherit px-3 py-1.5 text-[11px] ${labelClass} ${row.sub ? "pl-6" : ""}`}>{row.label}</td>
                  {periods.map((p, ci) => {
                    const value = row.values[ci];
                    const { text, className } = renderValue(value, decimals, suffix, row.signed ?? false);
                    const tier = row.tierFor && value !== null ? row.tierFor(value) : null;
                    return (
                      <Cell key={p.label} isFy={p.isFy} className={`${tier ? TIER_TEXT[tier] : className} ${tone === "plain" && !tier ? "text-text" : ""}`}>
                        {text}
                        {/* Pill only on full-year columns — quarterly columns stay narrow. */}
                        {tier && p.isFy && (
                          <span className="mt-1 block">
                            <TierPill tier={tier} compact />
                          </span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
