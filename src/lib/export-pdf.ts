import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PnlRow } from "@/types";
import { formatPct } from "@/lib/calculations";

const NAVY: [number, number, number] = [15, 41, 66];
const TEAL: [number, number, number] = [14, 165, 178];
const GOLD: [number, number, number] = [245, 166, 35];

export function exportPnlToPdf(rows: PnlRow[], scopeLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cover
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 45, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Procurement P&L Dashboard", 14, 20);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Board Report", 14, 29);
  doc.setFontSize(9);
  doc.text(`Scope: ${scopeLabel}  ·  Generated ${new Date().toLocaleDateString()}`, 14, 38);

  // Executive summary KPIs
  const actual = rows.filter((r) => r.recordType === "actual");
  const budget = rows.filter((r) => r.recordType === "budget");
  const sum = (list: PnlRow[], key: keyof PnlRow) => list.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
  const actualNvc = sum(actual, "netValueCreation");
  const actualCost = sum(actual, "totalCostIncurred");
  const actualRoi = actualCost > 0 ? (actualNvc / actualCost) * 100 : 0;
  const budgetNvc = sum(budget, "netValueCreation");

  let y = 55;
  doc.setTextColor(15, 41, 66);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Executive Summary", 14, y);
  y += 8;

  const kpis: [string, string, [number, number, number]][] = [
    ["Actual Net Value Creation", `$${actualNvc.toFixed(2)}Mn`, TEAL],
    ["Budget Net Value Creation", `$${budgetNvc.toFixed(2)}Mn`, GOLD],
    ["ROI (NVC / Cost Incurred)", formatPct(actualRoi), TEAL],
    ["Records in scope", String(rows.length), GOLD],
  ];
  const kpiWidth = (pageWidth - 28) / kpis.length;
  kpis.forEach(([label, value, color], i) => {
    const x = 14 + i * kpiWidth;
    doc.setDrawColor(220, 220, 220);
    doc.rect(x, y, kpiWidth - 4, 22);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 3, y + 7, { maxWidth: kpiWidth - 8 });
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 3, y + 17);
  });
  y += 30;

  // Full data table
  autoTable(doc, {
    startY: y,
    head: [["Division", "Period", "Type", "Value Creation", "Cost Incurred", "Net Value Creation", "ROI %"]],
    body: rows.map((r) => [
      r.division,
      r.periodLabel,
      r.recordType === "actual" ? "Actual" : "Budget",
      `$${r.totalValueCreation.toFixed(2)}Mn`,
      `$${r.totalCostIncurred.toFixed(2)}Mn`,
      `$${r.netValueCreation.toFixed(2)}Mn`,
      formatPct(r.roiPct),
    ]),
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Source: Procurement P&L Database · FX: Bank Indonesia JISDOR · Benchmarks: Hackett Group", 14, doc.internal.pageSize.getHeight() - 8);

  doc.save(`Procurement_PnL_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}
