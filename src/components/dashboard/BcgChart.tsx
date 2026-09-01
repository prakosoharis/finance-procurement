"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type Plugin,
} from "chart.js";
import { Chart } from "react-chartjs-2";

// The generic mixed-type <Chart> component (we render "bar" + "line" datasets together)
// needs each type's *controller* registered, not just its element — omitting
// BarController/LineController throws "'bar' is not a registered controller" on a
// fresh page load. This didn't surface in local dev because Fast Refresh can leave a
// prior registration sitting in Chart.js's global registry across edits; a real
// production build starts from a clean registry, so it failed there first.
ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, LineController, LineElement, PointElement, Title, Tooltip, Legend);

const GRID = "#253348";
const TICK = "#5e7a98";

/** Draws the numeric value above every bar and line point, BCG-exhibit style. */
export const valueLabels: Plugin<"bar"> = {
  id: "bcgValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "600 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      const isLine = meta.type === "line";
      meta.data.forEach((element, i) => {
        const raw = dataset.data[i];
        if (typeof raw !== "number" || !Number.isFinite(raw) || raw === 0) return;
        const text = isLine ? `${raw.toFixed(1)}%` : raw.toFixed(1);
        const { x, y } = element.getProps(["x", "y"], true);
        // White halo keeps labels readable where they overlap bars or gridlines.
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(11,15,21,0.85)";
        ctx.strokeText(text, x, y - 4);
        ctx.fillStyle = isLine ? "#f5a623" : "#c8ddf0";
        ctx.fillText(text, x, y - 4);
      });
    });
    ctx.restore();
  },
};

export function BcgComboChart({
  labels,
  barLabel,
  barData,
  barColor,
  lineLabel,
  lineData,
  lineColor,
}: {
  labels: string[];
  barLabel: string;
  barData: number[];
  barColor: string;
  lineLabel: string;
  lineData: number[];
  lineColor: string;
}) {
  return (
    <Chart
      type="bar"
      plugins={[valueLabels]}
      data={{
        labels,
        datasets: [
          { type: "bar" as const, label: barLabel, data: barData, backgroundColor: barColor, borderRadius: 2, yAxisID: "y", order: 2 },
          {
            type: "line" as const,
            label: lineLabel,
            data: lineData,
            borderColor: lineColor,
            backgroundColor: lineColor,
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: lineColor,
            tension: 0.25,
            yAxisID: "y1",
            order: 1,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 22 } },
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } },
          y: { position: "left", ticks: { color: TICK, font: { size: 10 } }, grid: { color: GRID } },
          y1: {
            position: "right",
            ticks: { color: TICK, font: { size: 10 }, callback: (v) => `${v}%` },
            grid: { display: false },
          },
        },
      }}
    />
  );
}

export function RoiTrendChart({ labels, actual, target }: { labels: string[]; actual: (number | null)[]; target: (number | null)[] }) {
  return (
    <Chart
      type="line"
      data={{
        labels,
        datasets: [
          { type: "line" as const, label: "Actual", data: actual, borderColor: "#3ddc84", backgroundColor: "#3ddc84", borderWidth: 2.5, pointRadius: 3, tension: 0.25 },
          {
            type: "line" as const,
            label: "Target",
            data: target,
            borderColor: "#f5a623",
            backgroundColor: "#f5a623",
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 2,
            tension: 0.25,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: TICK, font: { size: 10 }, callback: (v) => `${v}%` }, grid: { color: GRID } },
        },
      }}
    />
  );
}

export function AchievementChart({ labels, values }: { labels: string[]; values: (number | null)[] }) {
  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: "Achievement",
            data: values,
            backgroundColor: values.map((v) => (v !== null && v >= 1 ? "#00a878" : "#dc3545")),
            borderRadius: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: TICK, font: { size: 10 }, callback: (v) => `${v}×` }, grid: { color: GRID } },
        },
      }}
    />
  );
}
