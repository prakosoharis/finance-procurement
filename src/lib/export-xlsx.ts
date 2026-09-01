import * as XLSX from "xlsx-js-style";
import type { PnlRow } from "@/types";
import { COST_COMPONENT_DEFS } from "@/lib/calculations";

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "0F2942" } },
  alignment: { horizontal: "center" as const, wrapText: true },
};

export function exportPnlToXlsx(rows: PnlRow[], scopeLabel: string) {
  const headers = [
    "Division",
    "Period",
    "Type",
    "Cost Saving",
    "Cost Avoidance",
    "Total Value Creation",
    "Initial SUM",
    "SUM after Saving",
    "Total Cost Incurred",
    "Net Value Creation",
    "ROI %",
    "Value to SUM %",
    "Revenue",
    "GP",
    ...COST_COMPONENT_DEFS.map((c) => c.label),
  ];

  const body = rows.map((r) => [
    r.division,
    r.periodLabel,
    r.recordType === "actual" ? "Actual" : "Budget",
    r.costSaving,
    r.costAvoidance,
    r.totalValueCreation,
    r.initialSum,
    r.sumAfterSaving,
    r.totalCostIncurred,
    r.netValueCreation,
    Number(r.roiPct.toFixed(2)),
    Number(r.valueToSumPct.toFixed(2)),
    r.revenue,
    r.grossProfit,
    ...COST_COMPONENT_DEFS.map((c) => r.costComponents[c.key] ?? 0),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = HEADER_STYLE;
  }
  rows.forEach((r, i) => {
    const typeCell = ws[XLSX.utils.encode_cell({ r: i + 1, c: 2 })];
    if (typeCell) {
      typeCell.s = {
        font: { bold: true, color: { rgb: r.recordType === "actual" ? "1E40AF" : "C2410C" } },
      };
    }
  });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "P&L Export");
  XLSX.writeFile(wb, `Procurement_PnL_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}.xlsx`);
}
