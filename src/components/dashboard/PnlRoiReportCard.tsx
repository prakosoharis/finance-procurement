import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS, convertValue } from "@/lib/calculations";
import type { Currency } from "@/store/useFilterStore";

export function PnlRoiReportCard({ row, currency, rate }: { row: PnlRow; currency: Currency; rate: number }) {
  const isActual = row.recordType === "actual";
  const unit = currency === "USD" ? "USD Mn" : "IDR Bn";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-md">
      <div className={`flex items-center justify-between px-4 py-2.5 ${isActual ? "bg-gradient-to-r from-[#0f2942] via-[#1e3a8a] to-[#0f2942]" : "bg-gradient-to-r from-[#7c2d12] via-[#c2410c] to-[#7c2d12]"}`}>
        <span className="text-xs font-bold uppercase tracking-wide text-white">
          {isActual ? "Actual" : "Budget"} — in {unit}
        </span>
        <span className={`rounded-[2px] px-3 py-1 text-[11px] font-bold ${isActual ? "bg-[#fbbf24] text-black" : "bg-[#f97316] text-white"}`}>{row.division}</span>
      </div>

      <div className="divide-y divide-slate-100">
        <Section title="Value Creation">
          <Line label="Cost Saving" value={row.costSaving} currency={currency} rate={rate} />
          <Line label="Cost Avoidance" value={row.costAvoidance} currency={currency} rate={rate} />
          <Line label="Total Value Creation" value={row.totalValueCreation} currency={currency} rate={rate} bold />
        </Section>

        <Section title="Costs Incurred">
          {COST_COMPONENT_DEFS.map((c) => (
            <Line key={c.key} label={c.label} value={row.costComponents[c.key] ?? 0} currency={currency} rate={rate} />
          ))}
          <Line label="Total Cost Incurred" value={row.totalCostIncurred} currency={currency} rate={rate} bold />
        </Section>

        <Line label="Net Value Creation" value={row.netValueCreation} currency={currency} rate={rate} bold accent="net" />

        <Section title="SUM">
          <Line label="Initial SUM" value={row.initialSum} currency={currency} rate={rate} bold accent="sum" />
          <Line label="SUM after Saving" value={row.sumAfterSaving} currency={currency} rate={rate} bold accent="sum" />
        </Section>

        <Section title="Ratios">
          <Line label="ROI (Net Value / Costs)" value={row.roiPct} suffix="%" accent="net" currency={currency} rate={rate} />
          <Line label="Value to SUM" value={row.valueToSumPct} suffix="%" accent="net" currency={currency} rate={rate} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2">
      <p className="pt-1.5 text-[12.5px] font-bold text-slate-900">{title}</p>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function Line({
  label,
  value,
  bold,
  suffix,
  accent,
  currency,
  rate,
}: {
  label: string;
  value: number;
  bold?: boolean;
  suffix?: "%";
  accent?: "net" | "sum";
  currency: "USD" | "IDR";
  rate: number;
}) {
  const converted = suffix === "%" ? value : convertValue(value, currency, rate);
  const display = suffix === "%" ? `${converted.toFixed(1)}%` : converted.toFixed(2);

  if (accent === "net") {
    return (
      <div className="-mx-4 flex items-center justify-between border-y-2 border-[#0284c7] bg-[#7dd3fc] px-4 py-2 text-[13px] font-bold text-[#0c4a6e]">
        <span>{label}</span>
        <span className="font-mono">{display}</span>
      </div>
    );
  }
  if (accent === "sum") {
    return (
      <div className="-mx-4 flex items-center justify-between bg-[#fdba74] px-4 py-1.5 text-[12px] font-bold text-[#7c2d12]">
        <span>{label}</span>
        <span className="font-mono">{display}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-between text-[11.5px] ${bold ? "pt-1" : "pl-2.5"}`}>
      <span className={bold ? "font-semibold text-slate-700" : "text-slate-500"}>{label}</span>
      <span className={`font-mono text-slate-900 ${bold ? "font-bold" : ""}`}>{display}</span>
    </div>
  );
}
