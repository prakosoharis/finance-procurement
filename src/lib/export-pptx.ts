import PptxGenJS from "pptxgenjs";
import type { PnlRow } from "@/types";
import { formatPct, convertValue } from "@/lib/calculations";

const NAVY = "0F2942";
const TEAL = "00D4F5";
const GOLD = "F5A623";

export async function exportPnlToPptx(rows: PnlRow[], scopeLabel: string, currency: "USD" | "IDR", rate: number) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";

  const unit = currency === "USD" ? "USD Mn" : "IDR Bn";
  const money = (v: number) => convertValue(v, currency, rate).toFixed(2);

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  cover.addText("Procurement P&L Dashboard", { x: 0.6, y: 2.6, w: 12, h: 1, fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Arial" });
  cover.addText("Board Report", { x: 0.6, y: 3.4, w: 12, h: 0.6, fontSize: 16, color: GOLD, fontFace: "Arial" });
  cover.addText(`Scope: ${scopeLabel}  ·  ${unit}  ·  Generated ${new Date().toLocaleDateString()}`, {
    x: 0.6,
    y: 4.0,
    w: 12,
    h: 0.5,
    fontSize: 11,
    color: "93C5FD",
    fontFace: "Arial",
  });

  // Executive summary
  const actual = rows.filter((r) => r.recordType === "actual");
  const budget = rows.filter((r) => r.recordType === "budget");
  const sum = (list: PnlRow[], key: keyof PnlRow) => list.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
  const actualNvc = sum(actual, "netValueCreation");
  const actualCost = sum(actual, "totalCostIncurred");
  const actualRoi = actualCost > 0 ? (actualNvc / actualCost) * 100 : 0;
  const budgetNvc = sum(budget, "netValueCreation");

  const summary = pptx.addSlide();
  summary.addText("Executive Summary", { x: 0.5, y: 0.35, w: 12, h: 0.6, fontSize: 22, bold: true, color: NAVY, fontFace: "Arial" });

  const kpis: [string, string, string][] = [
    ["Actual Net Value Creation", `${money(actualNvc)} ${unit}`, TEAL],
    ["Budget Net Value Creation", `${money(budgetNvc)} ${unit}`, GOLD],
    ["ROI (NVC / Cost Incurred)", formatPct(actualRoi), TEAL],
    ["Records in Scope", String(rows.length), GOLD],
  ];
  const kpiW = 2.9;
  kpis.forEach(([label, value, color], i) => {
    const x = 0.5 + i * (kpiW + 0.2);
    summary.addShape("roundRect", { x, y: 1.3, w: kpiW, h: 1.4, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.08 });
    summary.addText(label, { x: x + 0.15, y: 1.4, w: kpiW - 0.3, h: 0.5, fontSize: 9, color: "64748B", fontFace: "Arial" });
    summary.addText(value, { x: x + 0.15, y: 1.85, w: kpiW - 0.3, h: 0.6, fontSize: 20, bold: true, color, fontFace: "Arial" });
  });

  // Data table (chunked across slides — pptxgenjs auto table doesn't paginate, so cap rows per slide)
  const header = ["Division", "Period", "Type", "Value Creation", "Cost Incurred", "Net Value Creation", "ROI %"];
  const ROWS_PER_SLIDE = 16;
  for (let i = 0; i < rows.length; i += ROWS_PER_SLIDE) {
    const chunk = rows.slice(i, i + ROWS_PER_SLIDE);
    const slide = pptx.addSlide();
    slide.addText(`P&L Detail${rows.length > ROWS_PER_SLIDE ? ` (${i / ROWS_PER_SLIDE + 1})` : ""}`, {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: NAVY,
      fontFace: "Arial",
    });

    const tableRows = [
      header.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontSize: 10 } })),
      ...chunk.map((r) => [
        { text: r.division, options: { fontSize: 9 } },
        { text: r.periodLabel, options: { fontSize: 9 } },
        { text: r.recordType === "actual" ? "Actual" : "Budget", options: { fontSize: 9, color: r.recordType === "actual" ? "1E40AF" : "C2410C" } },
        { text: `${money(r.totalValueCreation)} ${unit}`, options: { fontSize: 9, align: "right" as const } },
        { text: `${money(r.totalCostIncurred)} ${unit}`, options: { fontSize: 9, align: "right" as const } },
        { text: `${money(r.netValueCreation)} ${unit}`, options: { fontSize: 9, align: "right" as const } },
        { text: formatPct(r.roiPct), options: { fontSize: 9, align: "right" as const } },
      ]),
    ];
    slide.addTable(tableRows, { x: 0.5, y: 1.0, w: 12.3, colW: [1.8, 1.6, 1.3, 1.9, 1.9, 1.9, 1.9], border: { type: "solid", color: "E2E8F0", pt: 0.5 } });
  }

  await pptx.writeFile({ fileName: `Procurement_PnL_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}.pptx` });
}
