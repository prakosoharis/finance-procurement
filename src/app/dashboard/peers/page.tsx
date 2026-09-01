"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { usePeers } from "@/hooks/usePeers";
import { roiBenchmarkFor } from "@/lib/calculations";
import { buildSmartMoves, PRIORITY_LABEL } from "@/lib/smart-moves";
import { TierBadge } from "@/components/dashboard/TierBadge";
import { Card, CardBar } from "@/components/dashboard/Card";

export default function PeerParityPage() {
  const { division, year, quarter } = useFilterStore();
  const { data: rows, isLoading: rowsLoading } = usePnlData({ division, year, quarter, type: "actual" });
  const { data: peers, isLoading: peersLoading } = usePeers(division);

  if (rowsLoading || peersLoading) return <p className="text-sm text-muted">Loading peer benchmarks...</p>;

  const scopedRows = rows ?? [];
  const latest = [...scopedRows].sort((a, b) => (a.isFy ? 1 : 0) - (b.isFy ? 1 : 0) || a.year - b.year || (a.quarter ?? 0) - (b.quarter ?? 0)).pop();
  const ourRoi = latest?.roiPct ?? 0;
  const ourMultiple = ourRoi / 100;
  const benchmark = roiBenchmarkFor(ourRoi);
  const moves = buildSmartMoves(scopedRows, peers ?? [], division);

  const maxMultiple = Math.max(ourMultiple, ...(peers ?? []).map((p) => Number(p.roiMultiple)), 1) * 1.15;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardBar>
            <span>Your {division} Metrics</span>
            <span className="ml-auto font-normal normal-case text-muted">{latest?.periodLabel ?? "No data"}</span>
          </CardBar>
          <div className="grid grid-cols-2 gap-3 p-4 text-xs">
            <div>
              <p className="text-[10px] uppercase text-muted">Net Value Creation</p>
              <p className="mt-1 font-mono text-lg font-bold text-teal">${(latest?.netValueCreation ?? 0).toFixed(2)}Mn</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted">Cost Incurred</p>
              <p className="mt-1 font-mono text-lg font-bold text-gold">${(latest?.totalCostIncurred ?? 0).toFixed(2)}Mn</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted">ROI</p>
              <p className="mt-1 font-mono text-lg font-bold text-green">
                {ourRoi.toFixed(1)}% ({ourMultiple.toFixed(1)}×)
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted">Value / SUM</p>
              <p className="mt-1 font-mono text-lg font-bold text-purple">{(latest?.valueToSumPct ?? 0).toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardBar>
            <span>Hackett Tier Position</span>
          </CardBar>
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <TierBadge roiPct={ourRoi} />
            <p className="text-xs text-muted">
              {division} sits in the <b className="text-text">{benchmark.label}</b> tier (NVC ÷ Cost Incurred = {ourMultiple.toFixed(1)}×).
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardBar>
          <span>📊 Peer Parity — ROI Comparison</span>
        </CardBar>
        <div className="space-y-2.5 p-4">
          <BarRow label="Your ROI" value={ourMultiple} max={maxMultiple} tone="you" />
          {(peers ?? []).length === 0 ? (
            <p className="text-xs text-muted">No peer benchmarks configured for this division yet.</p>
          ) : (
            peers!.map((p) => (
              <BarRow
                key={p.id}
                label={p.peerName}
                value={Number(p.roiMultiple)}
                max={maxMultiple}
                tone="peer"
                source={p.sourceUrl ? { label: p.sourceLabel, url: p.sourceUrl } : undefined}
              />
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardBar>
          <span>🎯 Smart Moves — Anchored in Your Data</span>
        </CardBar>
        <div className="space-y-3 p-4">
          {moves.length === 0 ? (
            <p className="text-xs text-muted">No data-triggered recommendations for this scope right now — the numbers don&apos;t flag any of the conditions this engine checks for.</p>
          ) : (
            moves.map((m, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg3 p-3.5">
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
            ))
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
  source?: { label: string; url: string };
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className={`w-32 flex-shrink-0 truncate ${tone === "you" ? "font-bold text-text" : "text-muted"}`}>{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-bg3">
        <div className={`h-full rounded-full ${tone === "you" ? "bg-teal" : "bg-gold/70"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-14 flex-shrink-0 text-right font-mono ${tone === "you" ? "font-bold text-teal" : "text-muted"}`}>{value.toFixed(1)}×</span>
      {source && (
        <a href={source.url} target="_blank" rel="noreferrer" className="w-24 flex-shrink-0 truncate text-[10px] text-muted hover:text-teal">
          {source.label}
        </a>
      )}
    </div>
  );
}
