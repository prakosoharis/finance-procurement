import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS } from "@/lib/calculations";

export function PnlRoiReportCard({ row }: { row: PnlRow }) {
  const isActual = row.recordType === "actual";

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between bg-[#0f2942] px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wide text-white">
          {isActual ? "Actual" : "Budget"} — in USD Mn
        </span>
        <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-bg">{row.division}</span>
      </div>

      <div className="divide-y divide-border">
        <Section title="Value Creation">
          <Line label="Cost Saving" value={row.costSaving} />
          <Line label="Cost Avoidance" value={row.costAvoidance} />
          <Line label="Total Value Creation" value={row.totalValueCreation} bold />
        </Section>

        <Section title="Cost Incurred (15 components)">
          {COST_COMPONENT_DEFS.map((c) => (
            <Line key={c.key} label={c.label} value={row.costComponents[c.key] ?? 0} />
          ))}
          <Line label="Total Cost Incurred" value={row.totalCostIncurred} bold />
        </Section>

        <Section title="Net Value Creation">
          <Line label="Net Value Creation" value={row.netValueCreation} bold accent="cyan" />
        </Section>

        <Section title="SUM">
          <Line label="Initial SUM" value={row.initialSum} />
          <Line label="SUM after Saving" value={row.sumAfterSaving} bold accent="orange" />
        </Section>

        <Section title="Ratios">
          <Line label="ROI %" value={row.roiPct} suffix="%" accent="cyan" />
          <Line label="Value to SUM %" value={row.valueToSumPct} suffix="%" accent="cyan" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Line({
  label,
  value,
  bold,
  suffix = "Mn",
  accent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  suffix?: string;
  accent?: "cyan" | "orange";
}) {
  const accentClass = accent === "cyan" ? "text-teal" : accent === "orange" ? "text-gold" : "text-text";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={bold ? "font-semibold text-light" : "text-muted"}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${accentClass}`}>
        {suffix === "%" ? value.toFixed(1) : value.toFixed(2)}
        {suffix === "%" ? "%" : ""}
      </span>
    </div>
  );
}
