"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { PnlRow } from "@/types";
import type { ChartMetric } from "@/store/useFilterStore";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const METRIC_KEY: Record<ChartMetric, keyof PnlRow> = {
  sum: "initialSum",
  vc: "totalValueCreation",
  nvc: "netValueCreation",
  cost: "totalCostIncurred",
};

export function BcgChart({ rows, metric }: { rows: PnlRow[]; metric: ChartMetric }) {
  const periods = [...new Set(rows.map((r) => r.periodLabel))];
  const key = METRIC_KEY[metric];

  const actualSeries = periods.map((p) => Number(rows.find((r) => r.periodLabel === p && r.recordType === "actual")?.[key] ?? 0));
  const budgetSeries = periods.map((p) => Number(rows.find((r) => r.periodLabel === p && r.recordType === "budget")?.[key] ?? 0));

  return (
    <Chart
      type="bar"
      data={{
        labels: periods,
        datasets: [
          { type: "bar" as const, label: "Actual", data: actualSeries, backgroundColor: "#00d4f5" },
          { type: "bar" as const, label: "Budget", data: budgetSeries, backgroundColor: "#f5a623" },
          {
            type: "line" as const,
            label: "Actual Trend",
            data: actualSeries,
            borderColor: "#3ddc84",
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { labels: { color: "#8ba8c4", font: { size: 11 } } },
        },
        scales: {
          x: { ticks: { color: "#5e7a98" }, grid: { color: "#253348" } },
          y: { ticks: { color: "#5e7a98" }, grid: { color: "#253348" } },
        },
      }}
    />
  );
}
