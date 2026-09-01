"use client";

import { useMemo } from "react";
import { useFilterStore, type ChartMetric } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { unitLabel } from "@/lib/format";
import { buildChartSeries, buildTakeaway, buildVarianceCards, cagr, average, METRIC_CFG } from "@/lib/chart-series";
import { BcgComboChart, RoiTrendChart, AchievementChart } from "@/components/dashboard/BcgChart";

const METRICS: { key: ChartMetric; label: string }[] = [
  { key: "sum", label: "SUM" },
  { key: "vc", label: "VC" },
  { key: "nvc", label: "NVC" },
  { key: "cost", label: "Cost" },
];

function BcgHeader({ eyebrow, title, subtitle, right }: { eyebrow: string; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-end justify-between gap-5 border-b-2 border-teal px-1 pb-3.5">
      <div className="min-w-[280px] flex-1">
        <div className="mb-1.5 text-[10px] font-bold tracking-[0.14em] text-teal">{eyebrow}</div>
        <h2 className="mb-1 text-[22px] font-bold leading-tight tracking-tight text-text">{title}</h2>
        <div className="text-[12px] font-normal leading-snug text-muted">{subtitle}</div>
      </div>
      {right}
    </div>
  );
}

function Panel({
  tone,
  eyebrow,
  title,
  unit,
  stats,
  children,
  legend,
}: {
  tone: "actual" | "budget" | "plain";
  eyebrow: string;
  title: string;
  unit: string;
  stats?: { label: string; value: string; period: string; color?: string }[];
  children: React.ReactNode;
  legend: React.ReactNode;
}) {
  const topBar = tone === "actual" ? "bg-[#0096c7]" : tone === "budget" ? "bg-gold" : "bg-transparent";
  const eyebrowColor = tone === "actual" ? "text-[#0096c7]" : tone === "budget" ? "text-[#c44a00]" : "text-muted";
  return (
    <div data-ui="card" className="relative rounded-[2px] border border-border bg-bg2 px-5 pb-3.5 pt-[18px]">
      <div className={`absolute inset-x-0 top-0 h-[3px] ${topBar}`} />
      <div className="mb-3.5">
        <div className={`mb-1 text-[9px] font-bold uppercase tracking-[0.14em] ${eyebrowColor}`}>{eyebrow}</div>
        <div className="mb-0.5 text-[18px] font-bold tracking-tight text-text">{title}</div>
        <div className="text-[11px] font-normal text-muted">{unit}</div>
      </div>

      {stats && (
        <div className="mb-2 flex items-center justify-between gap-3 border-y border-border py-3">
          {stats.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center">
              {i > 0 && <div className="mr-3 h-8 w-px bg-border" />}
              <div className="flex-1 text-center">
                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{s.label}</div>
                <div className={`text-[19px] font-bold leading-none tracking-tight ${s.color ?? "text-text"}`}>{s.value}</div>
                <div className="mt-1 text-[9.5px] font-medium text-muted">{s.period}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative -mx-1 my-1.5 h-[320px]">{children}</div>

      <div className="flex flex-wrap items-center justify-center gap-3.5 border-t border-border pt-2.5">{legend}</div>
    </div>
  );
}

function Swatch({ color, line = false }: { color: string; line?: boolean }) {
  return <span className="inline-block align-middle" style={{ width: 14, height: line ? 3 : 10, borderRadius: 1, background: color }} />;
}

export default function ChartsPage() {
  const { division, year, quarter, currency, chartMetric, setChartMetric } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const unit = unitLabel(currency);
  const cfg = METRIC_CFG[chartMetric];

  const series = useMemo(
    () => buildChartSeries(rows ?? [], chartMetric, year, currency, rate),
    [rows, chartMetric, year, currency, rate]
  );

  if (isLoading) return <p className="text-sm text-muted">Loading charts...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  const hasData = series.labels.length > 0;
  const scope = `${division} · ${year === "All" ? "All Years" : year}`;

  const actCagr = cagr(series.actualBar);
  const budCagr = cagr(series.budgetBar);
  const lastIdx = series.labels.length - 1;
  const cagrPeriod = hasData ? `${series.labels[0]} → ${series.labels[lastIdx]}` : "—";
  const variance = buildVarianceCards(series, chartMetric, unit.split(" ")[1]);

  return (
    <div className="space-y-4">
      <BcgHeader
        eyebrow="EXHIBIT 1  |  PROCUREMENT PERFORMANCE"
        title={`Actual vs Budget — ${cfg.title} Analysis`}
        subtitle={`Multi-year trajectory with efficiency ratio overlay · ${scope}`}
        right={
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Metric Focus</span>
            <div className="flex gap-px rounded-[2px] border border-border bg-bg2 p-0.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  className={`rounded-[1px] px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.03em] transition ${
                    chartMetric === m.key ? "bg-[#0f2942] font-bold text-white" : "text-muted hover:bg-bg3 hover:text-text"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-[2px] border border-border border-l-4 border-l-teal bg-bg2 py-3.5 pl-[22px] pr-[18px]">
        <div className="flex-shrink-0 whitespace-nowrap rounded-[2px] border-[1.5px] border-teal px-2 py-1 text-[9px] font-extrabold tracking-[0.15em] text-teal">KEY TAKEAWAY</div>
        <div className="flex-1 text-[13px] font-medium leading-relaxed text-text">{buildTakeaway(series, chartMetric, division)}</div>
      </div>

      {!hasData ? (
        <p className="text-sm text-muted">No data for this scope yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              tone="actual"
              eyebrow="Actual Performance"
              title={cfg.title}
              unit={currency === "USD" ? "USD Millions" : "IDR Billions"}
              stats={[
                { label: "CAGR", value: actCagr !== null ? `${actCagr.toFixed(1)}%` : "—", period: cagrPeriod, color: "text-[#0096c7]" },
                { label: "Latest", value: series.actualBar[lastIdx].toFixed(2), period: series.labels[lastIdx] },
                { label: "Efficiency", value: `${average(series.actualLine).toFixed(2)}%`, period: cfg.lineLabel, color: "text-[#00a878]" },
              ]}
              legend={
                <>
                  <Swatch color="#0096c7" />
                  <span className="text-[11px] font-medium text-muted">{cfg.barLabel}</span>
                  <Swatch color="#f5a623" line />
                  <span className="text-[11px] font-medium text-muted">{cfg.lineLabel}</span>
                </>
              }
            >
              <BcgComboChart
                labels={series.labels}
                barLabel={cfg.barLabel}
                barData={series.actualBar}
                barColor="#0096c7"
                lineLabel={cfg.lineLabel}
                lineData={series.actualLine}
                lineColor="#f5a623"
              />
            </Panel>

            <Panel
              tone="budget"
              eyebrow="Budget / Target"
              title={cfg.title}
              unit={currency === "USD" ? "USD Millions" : "IDR Billions"}
              stats={[
                { label: "CAGR", value: budCagr !== null ? `${budCagr.toFixed(1)}%` : "—", period: cagrPeriod, color: "text-[#c44a00]" },
                { label: "Latest", value: series.budgetBar[lastIdx].toFixed(2), period: series.labels[lastIdx] },
                { label: "Efficiency", value: `${average(series.budgetLine).toFixed(2)}%`, period: cfg.lineLabel, color: "text-[#00a878]" },
              ]}
              legend={
                <>
                  <Swatch color="#f5a623" />
                  <span className="text-[11px] font-medium text-muted">{cfg.barLabel}</span>
                  <Swatch color="#c44a00" line />
                  <span className="text-[11px] font-medium text-muted">{cfg.lineLabel}</span>
                </>
              }
            >
              <BcgComboChart
                labels={series.labels}
                barLabel={cfg.barLabel}
                barData={series.budgetBar}
                barColor="#f5a623"
                lineLabel={cfg.lineLabel}
                lineData={series.budgetLine}
                lineColor="#c44a00"
              />
            </Panel>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
            {variance.map((c) => (
              <div
                key={c.label}
                data-ui="card"
                className={`rounded-[2px] border border-border bg-bg2 px-3.5 py-3 border-l-[3px] ${
                  c.tone === "pos" ? "border-l-[#00a878]" : c.tone === "neg" ? "border-l-[#dc3545]" : "border-l-muted"
                }`}
              >
                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">{c.label}</div>
                <div className={`text-[17px] font-bold leading-tight tracking-tight ${c.tone === "pos" ? "text-[#00a878]" : c.tone === "neg" ? "text-[#dc3545]" : "text-text"}`}>
                  {c.value}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-muted">{c.sub}</div>
              </div>
            ))}
          </div>

          <BcgHeader
            eyebrow="EXHIBIT 2  |  RETURN & ACHIEVEMENT"
            title="ROI Trajectory & Target Achievement"
            subtitle="Actual vs Target performance patterns across periods"
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              tone="plain"
              eyebrow="Return on Investment"
              title="ROI Trend"
              unit="NVC ÷ Cost Incurred · %"
              legend={
                <>
                  <Swatch color="#3ddc84" />
                  <span className="text-[11px] font-medium text-muted">Actual</span>
                  <Swatch color="#f5a623" line />
                  <span className="text-[11px] font-medium text-muted">Target</span>
                </>
              }
            >
              <RoiTrendChart labels={series.labels} actual={series.actualRoi} target={series.budgetRoi} />
            </Panel>

            <Panel
              tone="plain"
              eyebrow="Target Achievement"
              title="Achievement Multiplier"
              unit="Actual VC ÷ Target VC · Above 1.0× = beat target"
              legend={
                <>
                  <Swatch color="#00a878" />
                  <span className="text-[11px] font-medium text-muted">Above target</span>
                  <Swatch color="#dc3545" />
                  <span className="text-[11px] font-medium text-muted">Below target</span>
                </>
              }
            >
              <AchievementChart labels={series.labels} values={series.achievement} />
            </Panel>
          </div>

          <div className="border-t border-border px-1 pb-1 pt-2.5 text-[10px] italic tracking-[0.02em] text-muted">
            Source: Procurement P&amp;L Database · FX: Bank Indonesia JISDOR · Benchmarks: Hackett Group, Ardent Partners, CAPS Research
          </div>
        </>
      )}
    </div>
  );
}
