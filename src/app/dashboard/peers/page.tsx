"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFilterStore } from "@/store/useFilterStore";
import { useUiStore } from "@/store/useUiStore";
import { usePnlData } from "@/hooks/usePnlData";
import { usePeers } from "@/hooks/usePeers";
import { useFxLive } from "@/hooks/useFxRates";
import { convertValue } from "@/lib/calculations";
import { aggregationRows, sumField, moneyLabel, unitLabel } from "@/lib/format";
import { buildSmartMoves, PRIORITY_LABEL } from "@/lib/smart-moves";
import { PEER_DIVISIONS, peerMetaFor, buildProjection } from "@/lib/peer-meta";
import { TierBadge } from "@/components/dashboard/TierBadge";
import { Card, CardBar } from "@/components/dashboard/Card";

export default function PeerParityPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const setPendingAiPrompt = useUiStore((s) => s.setPendingAiPrompt);
  const router = useRouter();

  // This tab compares one real division at a time — "Combine" has no peer set, so
  // default to the first real division when the global filter is on Combine.
  const [peerDiv, setPeerDiv] = useState(() => (PEER_DIVISIONS.some((d) => d.code === division) ? division : PEER_DIVISIONS[0].code));
  const meta = peerMetaFor(peerDiv);

  const { data: rows, isLoading: rowsLoading } = usePnlData({ division: peerDiv, year, quarter, type: "actual" });
  const { data: peers, isLoading: peersLoading } = usePeers(peerDiv);
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const M = (v: number) => moneyLabel(convertValue(v, currency, rate), currency);

  const metrics = useMemo(() => {
    const actual = aggregationRows(rows ?? [], "actual");
    if (actual.length === 0) return null;
    const nvc = sumField(actual, "netValueCreation");
    const cost = sumField(actual, "totalCostIncurred");
    const vc = sumField(actual, "totalValueCreation");
    const sum = sumField(actual, "initialSum");
    const chronological = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5));
    return {
      nvc,
      cost,
      vc,
      sum,
      roiPct: cost > 0 ? (nvc / cost) * 100 : 0,
      vsrPct: sum > 0 ? (vc / sum) * 100 : 0,
      scope: `${chronological[0].periodLabel} → ${chronological[chronological.length - 1].periodLabel}`,
    };
  }, [rows]);

  // Projection anchors on the latest full year actually present in the data.
  const latestFy = useMemo(() => {
    const fy = (rows ?? []).filter((r) => r.recordType === "actual" && r.isFy).sort((a, b) => a.year - b.year);
    return fy.at(-1) ?? null;
  }, [rows]);

  if (rowsLoading || peersLoading) return <p className="text-sm text-muted">Loading peer benchmarks...</p>;

  const ourMultiple = metrics ? metrics.roiPct / 100 : 0;
  const peerList = peers ?? [];
  const maxMultiple = Math.max(ourMultiple, ...peerList.map((p) => Number(p.roiMultiple)), 1) * 1.15;
  const moves = buildSmartMoves(rows ?? [], peerList, peerDiv);
  const projection = latestFy ? buildProjection(latestFy.netValueCreation, latestFy.year) : [];

  function askAi() {
    if (!metrics) return;
    setPendingAiPrompt(
      `Using only our own procurement data, review ${peerDiv} for ${metrics.scope}: Net Value Creation ${M(metrics.nvc)}, Cost Incurred ${M(metrics.cost)}, ROI ${metrics.roiPct.toFixed(
        0
      )}% (${ourMultiple.toFixed(1)}x), Value-to-SUM ${metrics.vsrPct.toFixed(2)}%.${
        moves.length > 0 ? ` The top recommended action is "${moves[0].title}".` : ""
      } What should we prioritise next quarter? Do not reference external peer benchmarks.`
    );
    router.push("/dashboard/ai-assistant");
  }

  return (
    <div className="space-y-3.5">
      <Card>
        <CardBar>
          <span>🌍 Global Peer Parity Engine</span>
          <span className="ml-auto rounded bg-blueHdr/20 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case text-[#93c5fd]">
            Peer benchmarks · Actions · 3-Year Projection
          </span>
        </CardBar>

        {/* Division sub-tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border p-3.5">
          {PEER_DIVISIONS.map((d) => {
            const active = d.code === peerDiv;
            return (
              <button
                key={d.code}
                onClick={() => setPeerDiv(d.code)}
                className={`flex-1 min-w-[200px] rounded-[10px] border px-3.5 py-2.5 text-left transition ${
                  active ? "border-teal bg-teal/[0.08]" : "border-border bg-bg3 hover:border-teal/30"
                }`}
              >
                <div className={`text-[12px] font-bold ${active ? "text-teal" : "text-text"}`}>
                  {d.icon} {d.name}
                </div>
                <div className="mt-0.5 text-[10px] text-muted">{d.comparedTo}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3.5 p-3.5">
          {!metrics ? (
            <p className="text-sm text-muted">No data for {peerDiv} in the current year/period filter.</p>
          ) : (
            <>
              {/* Metric + audit cards */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[10px] border border-border bg-bg3 p-3.5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-teal">Your {peerDiv} Metrics</span>
                    <span className="font-mono text-[10px] text-muted">{metrics.scope}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.05em] text-muted">Net Value Creation</p>
                      <p className="mt-1 font-mono text-[17px] font-bold text-teal">{M(metrics.nvc)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.05em] text-muted">Cost Incurred</p>
                      <p className="mt-1 font-mono text-[17px] font-bold text-gold">{M(metrics.cost)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.05em] text-muted">ROI</p>
                      <p className="mt-1 font-mono text-[17px] font-bold text-green">
                        {metrics.roiPct.toFixed(0)}% · {ourMultiple.toFixed(1)}×
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.05em] text-muted">Value / SUM</p>
                      <p className="mt-1 font-mono text-[17px] font-bold text-purple">{metrics.vsrPct.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[10px] border border-gold/30 bg-gold/[0.04] p-3.5">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-gold">⚠️ Procurement ROI Check</div>
                  <div className="mb-2">
                    <TierBadge roiPct={metrics.roiPct} />
                  </div>
                  <p className="text-[11px] leading-relaxed text-light">
                    {peerList.length === 0
                      ? `No peer benchmarks are configured for ${peerDiv} yet, so this ROI is graded against the Hackett Group tiers only.`
                      : (() => {
                          const multiples = peerList.map((p) => Number(p.roiMultiple)).sort((a, b) => a - b);
                          const lo = multiples[0];
                          const hi = multiples[multiples.length - 1];
                          const position = ourMultiple > hi ? "above the highest benchmark on file" : ourMultiple < lo ? "below every benchmark on file" : "inside the benchmark band";
                          return `${peerDiv} returns ${ourMultiple.toFixed(1)}× against a benchmark band of ${lo.toFixed(1)}×–${hi.toFixed(1)}× — ${position}. Read the methodology caveat below before quoting this externally.`;
                        })()}
                  </p>
                </div>
              </div>

              {/* ROI comparison bars */}
              <div className="rounded-[10px] border border-border bg-bg3 p-3.5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-teal">📊 Peer Parity — ROI Comparison</div>
                <div className="space-y-2.5">
                  <BarRow label={`Your ${peerDiv}`} value={ourMultiple} max={maxMultiple} tone="you" />
                  <div className="my-2 border-t border-dashed border-border" />
                  {peerList.length === 0 ? (
                    <p className="text-[11px] text-muted">No peer benchmarks configured for this division yet — an admin can add them via the peers API.</p>
                  ) : (
                    peerList.map((p) => (
                      <BarRow
                        key={p.id}
                        label={p.peerName}
                        value={Number(p.roiMultiple)}
                        max={maxMultiple}
                        tone="peer"
                        source={{ label: p.sourceLabel, url: p.sourceUrl }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Methodology caveat */}
              <div className="rounded-[10px] border border-border border-l-4 border-l-gold bg-bg3 p-3.5">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-gold">⚠️ Methodology Caveat</div>
                <p className="text-[11px] leading-relaxed text-light">{meta.caveat}</p>
              </div>

              {/* Smart moves */}
              <div className="rounded-[10px] border border-border bg-bg3 p-3.5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-teal">🎯 Smart Moves — Anchored in Your Data</div>
                {moves.length === 0 ? (
                  <p className="text-[11px] text-muted">
                    No data-triggered recommendations for {peerDiv} right now — the numbers don&apos;t flag any of the conditions this engine checks for.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {moves.map((m, i) => (
                      <div key={i} className="rounded-lg border border-border bg-bg2 p-3.5">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold">{PRIORITY_LABEL[m.priority]}</span>
                          <span className="text-xs font-bold text-text">{m.title}</span>
                        </div>
                        <p className="mb-1.5 text-[11px] text-muted">
                          <b className="text-light">📊 What the data shows:</b> {m.finding}
                        </p>
                        <p className="mb-2 text-[11px] text-text">
                          <b className="text-teal">🎯 The move:</b> {m.move}
                        </p>
                        <div className="grid grid-cols-3 gap-2 border-t border-dashed border-border pt-2 text-[10px]">
                          <div>
                            <p className="uppercase text-muted">Who</p>
                            <p className="text-text">{m.who}</p>
                          </div>
                          <div>
                            <p className="uppercase text-muted">By when</p>
                            <p className="text-text">{m.when}</p>
                          </div>
                          <div>
                            <p className="uppercase text-muted">What you win</p>
                            <p className="text-text">{m.win}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3-year projection */}
              <div className="rounded-[10px] border border-border bg-bg3 p-3.5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-teal">📈 3-Year Net Value Creation Projection</div>
                {!latestFy || projection.length === 0 ? (
                  <p className="text-[11px] text-muted">Need at least one full-year (FY) actual in scope to project forward.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0c1524] text-light">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold">Scenario</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold">Growth</th>
                            {projection[0].years.map((y) => (
                              <th key={y.year} className="px-3 py-2 text-right text-[11px] font-semibold">
                                FY {y.year}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-right text-[11px] font-semibold">3-Yr Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projection.map((p) => (
                            <tr key={p.label} className="border-b border-border/40">
                              <td className={`px-3 py-1.5 font-semibold ${p.tone === "green" ? "text-green" : p.tone === "teal" ? "text-teal" : "text-muted"}`}>{p.label}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-muted">{(p.growth * 100).toFixed(0)}% CAGR</td>
                              {p.years.map((y) => (
                                <td key={y.year} className="px-3 py-1.5 text-right font-mono text-text">
                                  {M(y.value)}
                                </td>
                              ))}
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-teal">{M(p.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2.5 text-[10px] italic text-muted">
                      Compounded from FY {latestFy.year} actual Net Value Creation of {M(latestFy.netValueCreation)}. These are illustrative scenarios for planning discussion — not
                      forecasts or commitments.
                    </p>
                  </>
                )}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3.5">
                <button
                  onClick={askAi}
                  className="rounded-[7px] bg-gradient-to-br from-teal to-[#0891b2] px-3.5 py-2 text-[11px] font-bold text-bg transition hover:brightness-110"
                >
                  💬 Ask AI to Elaborate on This Analysis
                </button>
                <button
                  onClick={async () => {
                    if (!rows || rows.length === 0) return;
                    const { exportPnlToPptx } = await import("@/lib/export-pptx");
                    exportPnlToPptx(rows, `${peerDiv} Peer Parity`, currency, rate);
                  }}
                  disabled={!rows || rows.length === 0}
                  className="rounded-[7px] border border-gold/30 bg-bg3 px-3.5 py-2 text-[11px] font-semibold text-gold transition hover:bg-gold/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⬇ Export as PPT
                </button>
                <span className="ml-auto self-center font-mono text-[10px] text-muted">Values in {unitLabel(currency)}</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  tone,
  source,
}: {
  label: string;
  value: number;
  max: number;
  tone: "you" | "peer";
  source?: { label: string; url: string | null };
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className={`w-40 flex-shrink-0 truncate ${tone === "you" ? "font-bold text-text" : "text-muted"}`}>{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-bg2">
        <div className={`h-full rounded-full ${tone === "you" ? "bg-gradient-to-r from-teal to-[#0891b2]" : "bg-gold/70"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-14 flex-shrink-0 text-right font-mono ${tone === "you" ? "font-bold text-teal" : "text-muted"}`}>{value.toFixed(1)}×</span>
      <span className="w-40 flex-shrink-0 truncate text-[10px] text-muted">
        {source?.url ? (
          <a href={source.url} target="_blank" rel="noreferrer" className="hover:text-teal hover:underline">
            {source.label}
          </a>
        ) : (
          source?.label ?? ""
        )}
      </span>
    </div>
  );
}
