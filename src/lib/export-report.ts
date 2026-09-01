import { jsPDF } from "jspdf";
import autoTable, { type RowInput, type Styles } from "jspdf-autotable";
import PptxGenJS from "pptxgenjs";
import { type ReportModel, reportFmt, reportPct } from "@/lib/pnl-report";

const NAVY: [number, number, number] = [15, 41, 66];
const BROWN: [number, number, number] = [124, 45, 18];
const CYAN: [number, number, number] = [125, 211, 252];
const CYAN_TEXT: [number, number, number] = [12, 74, 110];
const ORANGE: [number, number, number] = [253, 186, 116];
const ORANGE_TEXT: [number, number, number] = [124, 45, 18];

/** Turns one report model into autoTable rows carrying the report's row styling. */
function toPdfRows(model: ReportModel): RowInput[] {
  const cols = model.periods.length + 1;
  const rows: RowInput[] = [];

  for (const line of model.lines) {
    if (line.style === "spacer") {
      rows.push([{ content: "", colSpan: cols, styles: { minCellHeight: 3, fillColor: [255, 255, 255] } }]);
      continue;
    }
    if (line.style === "section") {
      rows.push([{ content: line.label, colSpan: cols, styles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" } }]);
      continue;
    }
    if (line.style === "periods") {
      rows.push([
        { content: "", styles: { fillColor: [255, 255, 255] } },
        ...model.periods.map((p) => ({ content: p, styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: [71, 85, 105] as [number, number, number] } })),
      ]);
      continue;
    }

    const isPercent = line.style === "ratio";
    const cellStyle: Partial<Styles> =
      line.style === "net" || line.style === "ratio"
        ? { fillColor: CYAN, textColor: CYAN_TEXT, fontStyle: "bold" }
        : line.style === "sumInit" || line.style === "sumAfter"
          ? { fillColor: ORANGE, textColor: ORANGE_TEXT, fontStyle: "bold" }
          : line.style === "category"
            ? { fontStyle: "bold", textColor: [15, 23, 42] }
            : { textColor: [71, 85, 105] };

    rows.push([
      { content: (line.style === "sub" ? "    " : "") + line.label, styles: { ...cellStyle, halign: "left" } },
      ...model.periods.map((_, ci) => ({
        content: isPercent ? reportPct(line.values[ci] ?? null) : reportFmt(line.values[ci] ?? null),
        styles: { ...cellStyle, halign: "right" as const },
      })),
    ]);
  }
  return rows;
}

export function exportReportToPdf(models: ReportModel[], scopeLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  models.forEach((model, idx) => {
    if (idx > 0) doc.addPage();
    const accent = model.mode === "actual" ? NAVY : BROWN;

    doc.setFillColor(...accent);
    doc.rect(0, 0, pageWidth, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(model.title, pageWidth / 2, 11, { align: "center" });

    doc.setFillColor(model.mode === "actual" ? 251 : 249, model.mode === "actual" ? 191 : 115, model.mode === "actual" ? 36 : 22);
    doc.rect(14, 22, 34, 7, "F");
    doc.setTextColor(model.mode === "actual" ? 0 : 255, model.mode === "actual" ? 0 : 255, model.mode === "actual" ? 0 : 255);
    doc.setFontSize(9);
    doc.text(model.divisionTag, 16, 26.8);

    autoTable(doc, {
      startY: 33,
      body: toPdfRows(model),
      theme: "plain",
      styles: { fontSize: 7.5, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });

    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Scope: ${scopeLabel} · Generated ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.getHeight() - 7);
  });

  doc.save(`Procurement_PnL_Report_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

export async function exportReportToPptx(models: ReportModel[], scopeLabel: string) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";

  for (const model of models) {
    const slide = pptx.addSlide();
    const accent = model.mode === "actual" ? "0F2942" : "7C2D12";

    slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.7, fill: { color: accent } });
    slide.addText(model.title, { x: 0, y: 0.1, w: 13.33, h: 0.5, fontSize: 18, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial" });
    slide.addText(model.divisionTag, {
      x: 0.5,
      y: 0.85,
      w: 2,
      h: 0.32,
      fontSize: 11,
      bold: true,
      color: model.mode === "actual" ? "000000" : "FFFFFF",
      fill: { color: model.mode === "actual" ? "FBBF24" : "F97316" },
      align: "center",
      fontFace: "Arial",
    });

    const tableRows = model.lines
      .filter((l) => l.style !== "spacer")
      .map((line) => {
        if (line.style === "section") {
          return [{ text: line.label, options: { colspan: model.periods.length + 1, bold: true, color: "FFFFFF", fill: { color: "0F2942" }, fontSize: 9 } }];
        }
        if (line.style === "periods") {
          return [{ text: "", options: { fontSize: 8 } }, ...model.periods.map((p) => ({ text: p, options: { bold: true, align: "right" as const, fontSize: 8, color: "475569" } }))];
        }
        const isPercent = line.style === "ratio";
        const highlight =
          line.style === "net" || line.style === "ratio"
            ? { fill: { color: "7DD3FC" }, color: "0C4A6E", bold: true }
            : line.style === "sumInit" || line.style === "sumAfter"
              ? { fill: { color: "FDBA74" }, color: "7C2D12", bold: true }
              : line.style === "category"
                ? { bold: true, color: "0F172A" }
                : { color: "475569" };
        return [
          { text: (line.style === "sub" ? "   " : "") + line.label, options: { ...highlight, fontSize: 8 } },
          ...model.periods.map((_, ci) => ({
            text: isPercent ? reportPct(line.values[ci] ?? null) : reportFmt(line.values[ci] ?? null),
            options: { ...highlight, align: "right" as const, fontSize: 8 },
          })),
        ];
      });

    slide.addTable(tableRows, { x: 0.5, y: 1.3, w: 12.3, border: { type: "solid", color: "E2E8F0", pt: 0.4 } });
  }

  await pptx.writeFile({ fileName: `Procurement_PnL_Report_${scopeLabel.replace(/[^a-z0-9]+/gi, "_")}.pptx` });
}
