"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useFxRates, useFxLive } from "@/hooks/useFxRates";
import { useFilterStore } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { Card, CardBar } from "@/components/dashboard/Card";
import { aggregationRows, sumField } from "@/lib/format";

ChartJS.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip, Legend);

/** Rate range the inline bar scales against, matching the reference's 13.5k–17k window. */
const BAR_MIN = 13500;
const BAR_MAX = 17000;
/** FY 2025 BI JISDOR average — the reference's baseline for the "vs avg rate" callout. */
const BASELINE_RATE = 16516;

export default function FxRatesPage() {
  const { division, year, quarter } = useFilterStore();
  const { data: rates, isLoading } = useFxRates();
  const { data: live, isError: liveError } = useFxLive();
  const { data: rows } = usePnlData({ division, year, quarter, type: "actual" });

  // The FX provider returns fractional IDR; BI JISDOR is quoted as whole rupiah.
  const liveRate = live?.rate ? Math.round(live.rate) : liveError ? 16782 : null;

  const table = useMemo(() => {
    if (!rates) return [];
    // The API returns rows in period sort order, so the previous quarterly row is the
    // correct comparison base; FY rows are annual averages and have no prior-quarter delta.
    let prevQuarterRate: number | null = null;
    return rates.map((r) => {
      const avg = Number(r.rateIdrPerUsd);
      const isFy = r.periodLabel.startsWith("FY");
      const change = !isFy && prevQuarterRate !== null ? ((avg - prevQuarterRate) / prevQuarterRate) * 100 : null;
      if (!isFy) prevQuarterRate = avg;
      return { label: r.periodLabel, avg, isFy, change, barPct: Math.max(0, Math.min(100, ((avg - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100)) };
    });
  }, [rates]);

  const quarterly = table.filter((r) => !r.isFy);

  // Impact figures for the current filter scope, converted at the live rate.
  const impact = useMemo(() => {
    const actual = aggregationRows(rows ?? [], "actual");
    if (actual.length === 0 || !liveRate) return null;
    const nvc = sumField(actual, "netValueCreation");
    const spend = sumField(actual, "initialSum");
    return {
      nvcIdrBn: (nvc * liveRate) / 1000,
      spendIdrTn: (spend * liveRate) / 1_000_000,
      vsBaselinePct: ((liveRate - BASELINE_RATE) / BASELINE_RATE) * 100,
    };
  }, [rows, liveRate]);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Live rate card */}
        <div data-ui="card" className="relative overflow-hidden rounded-xl border-2 border-teal/20 bg-bg2 p-[18px]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-teal to-[#0088aa]" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-[5px] bg-gradient-to-br from-[#c0392b] to-[#e74c3c] px-2 py-[3px] text-[10px] font-bold text-white">
                🏦 Bank Indonesia
              </span>
              <span className="text-[10px] text-muted">JISDOR Transaction Rate</span>
            </div>
          </div>

          <div className="my-3 font-mono text-[42px] font-medium leading-none tracking-tight text-teal">
            {liveRate ? liveRate.toLocaleString("en-US") : "…"}
          </div>
          <div className="text-[11px] text-muted">
            IDR per 1 USD ·{" "}
            <a href="https://www.bi.go.id/en/statistik/informasi-kurs/transaksi-bi/default.aspx" target="_blank" rel="noreferrer" className="text-teal">
              bi.go.id ↗
            </a>
          </div>
          <div className="mt-2 flex flex-wrap gap-3.5 text-[11px] text-muted">
            <span>{liveError ? "⏰ BI close (fallback)" : live ? `⏰ Updated ${new Date(live.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : "⏰ Loading…"}</span>
            <span>
              Buy: <b className="text-light">{liveRate ? (liveRate - 40).toLocaleString("en-US") : "—"}</b>
            </span>
            <span>
              Sell: <b className="text-light">{liveRate ? (liveRate + 40).toLocaleString("en-US") : "—"}</b>
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="rounded-[7px] bg-bg3 px-3 py-2.5">
              <div className="mb-1 text-[10px] uppercase tracking-[0.05em] text-muted">NVC (IDR Bn)</div>
              <div className="font-mono text-[13px] font-medium text-teal">{impact ? impact.nvcIdrBn.toFixed(1) : "—"}</div>
            </div>
            <div className="rounded-[7px] bg-bg3 px-3 py-2.5">
              <div className="mb-1 text-[10px] uppercase tracking-[0.05em] text-muted">Spending (IDR Tn)</div>
              <div className="font-mono text-[13px] font-medium text-gold">{impact ? impact.spendIdrTn.toFixed(2) : "—"}</div>
            </div>
            <div className="rounded-[7px] bg-bg3 px-3 py-2.5">
              <div className="mb-1 text-[10px] uppercase tracking-[0.05em] text-muted">vs FY25 Avg Rate</div>
              <div className={`font-mono text-[13px] font-medium ${impact && impact.vsBaselinePct > 0 ? "text-red" : "text-green"}`}>
                {impact ? `${impact.vsBaselinePct >= 0 ? "+" : ""}${impact.vsBaselinePct.toFixed(2)}%` : "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[7px] bg-bg3 px-3.5 py-2.5 text-[11px] leading-[1.7] text-muted">
            <b className="text-light">Currency Toggle:</b>
            <br />
            <span className="text-[#93c5fd]">■ USD</span> — original P&amp;L values (USD Million)
            <br />
            <span className="text-[#fbbf24]">■ IDR</span> — each period × its quarterly BI JISDOR rate (IDR Billion)
          </div>
        </div>

        {/* Quarterly rate table */}
        <Card>
          <CardBar>
            <span>BI JISDOR Quarterly Rates</span>
          </CardBar>
          <div className="overflow-x-auto px-3.5 py-2.5">
            {isLoading ? (
              <p className="py-4 text-xs text-muted">Loading FX history...</p>
            ) : table.length === 0 ? (
              <p className="py-4 text-xs text-muted">No historical FX rates seeded yet.</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-border bg-[#0c1524] px-2.5 py-[7px] text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-light">Period</th>
                    <th className="border-b border-border bg-[#0c1524] px-2.5 py-[7px] text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-light">Avg Rate</th>
                    <th className="border-b border-border bg-[#0c1524] px-2.5 py-[7px] text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-light">vs Prior Qtr</th>
                    <th className="border-b border-border bg-[#0c1524] px-2.5 py-[7px] text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-light">
                      USD 1Mn → IDR Bn
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r) => (
                    <tr key={r.label} className={r.isFy ? "bg-fyCol font-bold" : ""}>
                      <td className={`border-b border-border/35 px-2.5 py-[7px] text-left text-[11px] font-semibold ${r.isFy ? "text-teal" : "text-light"}`}>{r.label}</td>
                      <td className="border-b border-border/35 px-2.5 py-[7px] text-center">
                        <b className="font-mono text-[12px] text-text">{r.avg.toLocaleString("en-US")}</b>
                        <span className="mt-[3px] block h-[2px] rounded-sm bg-teal opacity-35" style={{ width: `${r.barPct}%` }} />
                      </td>
                      <td className={`border-b border-border/35 px-2.5 py-[7px] text-center font-mono text-[12px] ${r.change === null ? "text-muted" : r.change >= 0 ? "text-green" : "text-red"}`}>
                        {r.change === null ? "—" : `${r.change >= 0 ? "+" : ""}${r.change.toFixed(1)}%`}
                      </td>
                      <td className="border-b border-border/35 px-2.5 py-[7px] text-center font-mono text-[12px] text-[#fbbf24]">IDR {(r.avg / 1000).toFixed(2)} Bn</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardBar>
          <span>USD/IDR Rate Trend — BI JISDOR Quarterly 2022–2026</span>
        </CardBar>
        <div className="p-3.5">
          <div className="relative h-[220px]">
            {quarterly.length > 0 && (
              <Chart
                type="line"
                data={{
                  labels: quarterly.map((r) => r.label.replace(/(Q\d) (\d{2})(\d{2})/, "$1 $3")),
                  datasets: [
                    {
                      label: "BI JISDOR Avg",
                      data: quarterly.map((r) => r.avg),
                      borderColor: "#f5a623",
                      backgroundColor: "rgba(245,166,35,.1)",
                      borderWidth: 2.5,
                      pointRadius: 3.5,
                      tension: 0.3,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: "#5e7a98", font: { size: 10 } }, grid: { color: "#253348" } },
                    y: { min: BAR_MIN, ticks: { color: "#5e7a98", font: { size: 10 }, callback: (v) => Number(v).toLocaleString("en-US") }, grid: { color: "#253348" } },
                  },
                }}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
