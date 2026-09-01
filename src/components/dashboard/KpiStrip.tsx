"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlSummary } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { convertValue, roiBenchmarkFor, vsrBenchmarkFor } from "@/lib/calculations";
import { unitLabel, kpiNum } from "@/lib/format";

const ACCENT: Record<string, { bar: string; text: string }> = {
  c1: { bar: "bg-teal", text: "text-teal" },
  c2: { bar: "bg-gold", text: "text-gold" },
  c3: { bar: "bg-green", text: "text-green" },
  c4: { bar: "bg-purple", text: "text-purple" },
  c5: { bar: "bg-[#60a5fa]", text: "text-[#60a5fa]" },
  c6: { bar: "bg-[#fbbf24]", text: "text-[#fbbf24]" },
};

function Kpi({
  id,
  label,
  value,
  sub,
  valueSize = "text-xl",
}: {
  id: keyof typeof ACCENT;
  label: string;
  value: string;
  sub?: React.ReactNode;
  valueSize?: string;
}) {
  const accent = ACCENT[id];
  return (
    <div data-ui="kpi-card" data-kpi={id} className="relative min-w-[150px] flex-1 overflow-hidden rounded-[10px] border border-border bg-bg2 px-3.5 py-3">
      <div data-ui="kpi-accent" className={`absolute inset-x-0 top-0 h-[2px] ${accent.bar}`} />
      <p data-ui="kpi-label" className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p data-ui="kpi-value" className={`font-mono ${valueSize} font-medium tracking-tight ${accent.text}`}>
        {value}
      </p>
      {sub && <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "pos" | "neg" | "neu" | "tier" }) {
  const cls = {
    pos: "bg-green/15 text-green",
    neg: "bg-red/15 text-red",
    neu: "bg-teal/10 text-teal",
    tier: "bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white",
  }[tone];
  return <span className={`rounded-full px-1.5 py-0.5 font-semibold ${cls}`}>{children}</span>;
}

export function KpiStrip() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: summary } = usePnlSummary({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const unit = unitLabel(currency);
  const money = (v: number) => `${kpiNum(convertValue(v, currency, rate))} ${unit.split(" ")[1]}`;

  const actual = summary?.actual;
  const budget = summary?.budget;

  const scopeLabel = summary?.periodFrom && summary.periodTo ? (summary.periodFrom === summary.periodTo ? summary.periodFrom : `${summary.periodFrom}–${summary.periodTo}`) : "Filtered";

  const nvcDelta = actual && budget && budget.netValueCreation !== 0 ? ((actual.netValueCreation - budget.netValueCreation) / Math.abs(budget.netValueCreation)) * 100 : null;
  const spendDelta = actual && budget && budget.initialSum !== 0 ? ((actual.initialSum - budget.initialSum) / Math.abs(budget.initialSum)) * 100 : null;
  const roiTier = actual ? roiBenchmarkFor(actual.roiPct) : null;
  const vsrTier = actual ? vsrBenchmarkFor(actual.valueToSumPct) : null;

  return (
    <div className="mb-5 flex flex-wrap gap-2.5">
      <Kpi
        id="c1"
        label={`NVC · ${scopeLabel}`}
        value={actual ? money(actual.netValueCreation) : "—"}
        sub={
          budget && nvcDelta !== null ? (
            <>
              <span>Target {kpiNum(convertValue(budget.netValueCreation, currency, rate))}</span>
              <Badge tone={nvcDelta >= 0 ? "pos" : "neg"}>
                {nvcDelta >= 0 ? "+" : ""}
                {nvcDelta.toFixed(1)}%
              </Badge>
            </>
          ) : (
            "—"
          )
        }
      />
      <Kpi
        id="c2"
        label="Spending (Filtered)"
        value={actual ? money(actual.initialSum) : "—"}
        sub={
          budget && spendDelta !== null ? (
            <>
              <span>Target {kpiNum(convertValue(budget.initialSum, currency, rate))}</span>
              <Badge tone={spendDelta <= 0 ? "pos" : "neg"}>
                {spendDelta >= 0 ? "+" : ""}
                {spendDelta.toFixed(1)}%
              </Badge>
            </>
          ) : (
            "—"
          )
        }
      />
      <Kpi
        id="c3"
        label="ROI (NVC/Cost Incurred)"
        value={actual ? `${actual.roiPct.toFixed(0)}% · ${(actual.roiPct / 100).toFixed(1)}×` : "—"}
        sub={
          budget && roiTier ? (
            <>
              <span>Target {budget.roiPct.toFixed(0)}%</span>
              <Badge tone="tier">{roiTier.label}</Badge>
            </>
          ) : (
            "—"
          )
        }
      />
      <Kpi
        id="c4"
        label="Value/SUM Ratio"
        value={actual ? `${actual.valueToSumPct.toFixed(2)}%` : "—"}
        sub={
          budget && vsrTier ? (
            <>
              <span>vs Target {budget.valueToSumPct.toFixed(2)}%</span>
              <Badge tone="neu">{vsrTier.label}</Badge>
            </>
          ) : (
            "—"
          )
        }
      />
      <Kpi
        id="c5"
        label="BI Rate (Live)"
        value={rate ? rate.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}
        valueSize="text-base"
        sub={
          <>
            <span>BI JISDOR</span>
            <Badge tone="neu">live</Badge>
          </>
        }
      />
      <Kpi
        id="c6"
        label="Currency Mode"
        value={unit}
        valueSize="text-base"
        sub={
          <>
            <Badge tone={currency === "USD" ? "neu" : "pos"}>{currency}</Badge>
            <span>active</span>
          </>
        }
      />
    </div>
  );
}
