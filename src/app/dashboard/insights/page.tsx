"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { buildInsightCards, buildCompanyRoiList, type InsightTone } from "@/lib/insights";
import { Card, CardBar } from "@/components/dashboard/Card";

const BULLET_COLOR: Record<InsightTone, string> = {
  good: "before:text-green",
  warn: "before:text-gold",
  bad: "before:text-red",
  neutral: "before:text-teal",
};

function RefColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-border bg-bg3 p-3.5">
      <div className="mb-2 border-b border-border pb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-teal">{title}</div>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-light">{children}</div>
    </div>
  );
}

export default function InsightsPage() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  if (isLoading) return <p className="text-sm text-muted">Loading insights...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;
  if (!rows || rows.length === 0) return <p className="text-sm text-muted">No data for this scope yet.</p>;

  const cards = buildInsightCards(rows, division, currency, rate);
  const companyRoi = buildCompanyRoiList(rows);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
        {cards.map((card) => (
          <div key={card.title} data-ui="card" className="rounded-xl border border-border bg-bg2 p-4">
            <h3 className="mb-2.5 border-b border-border pb-1.5 text-[12px] font-bold text-teal">{card.title}</h3>
            <ul className="flex flex-col gap-1.5">
              {card.bullets.map((b, i) => (
                <li
                  key={i}
                  className={`relative pl-3.5 text-[11px] leading-relaxed text-text before:absolute before:left-0 before:content-['•'] ${BULLET_COLOR[b.tone]}`}
                >
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Card>
        <CardBar>
          <span>ROI Benchmark References</span>
        </CardBar>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 p-3.5">
          <RefColumn title="ROI Formula">
            <p>
              <b className="text-text">ROI</b> = Net Value Creation ÷ Cost Incurred (Total) × 100%
            </p>
            <p>
              <b className="text-text">NVC</b> = Value Creation − Total Cost Incurred (15 components)
            </p>
            <p>
              <b className="text-text">Multiplier (×)</b> = ROI% ÷ 100 — e.g. 900% = 9×
            </p>
          </RefColumn>

          <RefColumn title="Industry Benchmarks (NVC / Total Cost Incurred)">
            <p>
              <span className="font-bold text-green">World Class</span> ≥900% (≥9×)
            </p>
            <p>
              <span className="font-bold text-teal">Excellent</span> 500–900% (5–9×)
            </p>
            <p>
              <span className="font-bold text-gold">Good</span> 300–500% (3–5×)
            </p>
            <p>
              <span className="font-bold text-muted">Average</span> 100–300% (1–3×)
            </p>
            <p>
              <span className="font-bold text-red">Below</span> &lt;100% (&lt;1×)
            </p>
            <p className="pt-1 text-[10px] italic text-muted">Source: The Hackett Group — Procurement Benchmark</p>
          </RefColumn>

          <RefColumn title="This Company (ROI = NVC / Total Cost Incurred)">
            {companyRoi.length === 0 ? (
              <p className="text-muted">No full-year data in this scope yet.</p>
            ) : (
              companyRoi.map((e) => (
                <p key={e.label}>
                  <b className="text-text">{e.label}</b>: <span className="font-mono text-teal">{e.roiPct.toFixed(0)}%</span> ({e.multiple.toFixed(1)}×) —{" "}
                  <span className="text-gold">{e.tag}</span>
                </p>
              ))
            )}
          </RefColumn>
        </div>
      </Card>
    </div>
  );
}
