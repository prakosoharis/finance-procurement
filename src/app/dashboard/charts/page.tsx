"use client";

import { useFilterStore, type ChartMetric } from "@/store/useFilterStore";
import { usePnlData } from "@/hooks/usePnlData";
import { BcgChart } from "@/components/dashboard/BcgChart";

const METRICS: { key: ChartMetric; label: string }[] = [
  { key: "sum", label: "SUM" },
  { key: "vc", label: "Value Creation" },
  { key: "nvc", label: "Net Value Creation" },
  { key: "cost", label: "Cost Incurred" },
];

export default function ChartsPage() {
  const { division, year, quarter, chartMetric, setChartMetric } = useFilterStore();
  const { data: rows, isLoading, error } = usePnlData({ division, year, quarter });

  if (isLoading) return <p className="text-sm text-muted">Loading charts...</p>;
  if (error) return <p className="text-sm text-red">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setChartMetric(m.key)}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              chartMetric === m.key ? "bg-teal text-bg" : "border border-border text-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-muted">No data for this scope yet.</p>
        ) : (
          <BcgChart rows={rows} metric={chartMetric} />
        )}
      </div>
    </div>
  );
}
