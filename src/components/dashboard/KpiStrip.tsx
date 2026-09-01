"use client";

import { useFilterStore } from "@/store/useFilterStore";
import { usePnlSummary } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { formatMoney, formatPct } from "@/lib/calculations";

const ACCENT: Record<string, string> = {
  c1: "before:bg-teal text-teal",
  c2: "before:bg-gold text-gold",
  c3: "before:bg-green text-green",
  c4: "before:bg-purple text-purple",
  c5: "before:bg-[#60a5fa] text-[#60a5fa]",
  c6: "before:bg-[#fbbf24] text-[#fbbf24]",
};

function Kpi({ id, label, value, sub, valueSize = "text-xl" }: { id: keyof typeof ACCENT; label: string; value: string; sub?: React.ReactNode; valueSize?: string }) {
  const accent = ACCENT[id];
  return (
    <div className="relative flex-1 min-w-[140px] overflow-hidden rounded-[10px] border border-border bg-bg2 px-3.5 py-3 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:content-['']">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accent.split(" ")[0]}`} />
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`font-mono ${valueSize} font-medium tracking-tight ${accent.split(" ")[1]}`}>{value}</p>
      {sub && <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

export function KpiStrip() {
  const { division, year, quarter, currency } = useFilterStore();
  const { data: summary } = usePnlSummary({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const actual = summary?.actual;
  const budget = summary?.budget;
  const nvcDeltaPct = actual && budget && budget.netValueCreation !== 0 ? ((actual.netValueCreation - budget.netValueCreation) / Math.abs(budget.netValueCreation)) * 100 : null;

  return (
    <div className="mb-5 flex flex-wrap gap-2.5">
      <Kpi
        id="c1"
        label="Net Value Creation (Filtered)"
        value={actual ? formatMoney(actual.netValueCreation, currency, rate) : "—"}
        sub={
          nvcDeltaPct !== null ? (
            <span className={`rounded-full px-1.5 py-0.5 font-semibold ${nvcDeltaPct >= 0 ? "bg-green/15 text-green" : "bg-red/15 text-red"}`}>
              {nvcDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(nvcDeltaPct).toFixed(1)}% vs budget
            </span>
          ) : (
            "—"
          )
        }
      />
      <Kpi id="c2" label="Spending (Filtered)" value={actual ? formatMoney(actual.totalCostIncurred, currency, rate) : "—"} sub={actual ? `${summary?.rowCount ?? 0} record(s)` : "—"} />
      <Kpi id="c3" label="ROI (NVC/Cost Incurred)" value={actual ? formatPct(actual.roiPct) : "—"} sub={budget ? `Budget: ${formatPct(budget.roiPct)}` : "—"} />
      <Kpi id="c4" label="Value/SUM Ratio" value={actual ? formatPct(actual.valueToSumPct) : "—"} />
      <Kpi id="c5" label="BI Rate (Live)" value={rate ? rate.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"} valueSize="text-base" sub={<span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-teal">live</span>} />
      <Kpi
        id="c6"
        label="Currency Mode"
        value={currency === "USD" ? "USD Mn" : "IDR Bn"}
        valueSize="text-base"
        sub={
          <span className={`rounded-full px-1.5 py-0.5 font-semibold ${currency === "USD" ? "bg-blueHdr/15 text-[#93c5fd]" : "bg-orgHdr/15 text-[#fde68a]"}`}>{currency} active</span>
        }
      />
    </div>
  );
}
