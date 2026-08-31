"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlSummary } from "@/hooks/usePnlData";
import { usePeers } from "@/hooks/usePeers";
import { roiBenchmarkFor } from "@/lib/calculations";

export default function PeerParityPage() {
  const { division, year, quarter } = useFilterStore();
  const { data: summary } = usePnlSummary({ division, year, quarter });
  const { data: peers, isLoading } = usePeers(division);

  const ourRoi = summary?.actual?.roiPct ?? 0;
  const benchmark = roiBenchmarkFor(ourRoi);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted">Our ROI (Actual)</p>
        <p className="mt-1 font-mono text-2xl font-bold text-teal">{ourRoi.toFixed(1)}%</p>
        <p className="mt-1 text-xs text-gold">Hackett tier: {benchmark.label}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading peer benchmarks...</p>
      ) : !peers || peers.length === 0 ? (
        <p className="text-sm text-muted">No peer benchmarks configured for this division yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg3 text-left text-[11px] uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Peer / Benchmark Body</th>
                <th className="px-3 py-2 text-right">ROI Multiple</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {peers.map((p) => (
                <tr key={p.id} className="border-t border-border even:bg-bg2">
                  <td className="px-3 py-2 font-medium text-text">{p.peerName}</td>
                  <td className="px-3 py-2 text-right font-mono text-gold">{Number(p.roiMultiple).toFixed(1)}x</td>
                  <td className="px-3 py-2 text-muted">{p.sourceLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
