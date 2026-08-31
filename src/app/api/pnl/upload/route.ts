import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { divisions, periods, pnlData, costComponents, dataUploads, userSessions } from "@/lib/db/schema";
import { inArray, sql } from "drizzle-orm";
import { parseWorkbook, type ParsedPnlRow } from "@/lib/xlsx-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB, per tech spec §6.4

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("admin");
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Validation failed: no file provided", code: 422 }, { status: 422 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Validation failed: file exceeds 10 MB limit", code: 422 }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseWorkbook(buffer);

  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    await db.insert(dataUploads).values({
      uploadedBy: session.user.id,
      filename: file.name,
      status: "failed",
      errorMessage: parsed.errors.join(" | "),
    });
    return NextResponse.json({ error: `Validation failed: ${parsed.errors.join(" | ")}`, code: 422 }, { status: 422 });
  }

  // Every row write below is batched into one statement per table (rather than looping
  // per row) — with the Neon HTTP driver each query is its own network round trip, and a
  // few hundred sequential round trips for a multi-hundred-row file pushed this past 55s,
  // dangerously close to the 60s serverless function limit.
  const divisionMap = await resolveDivisions(parsed.rows);
  const periodMap = await resolvePeriods(parsed.rows);

  const pnlValues = parsed.rows.map((row) => ({
    divisionId: divisionMap.get(row.division)!,
    periodId: periodMap.get(row.periodLabel)!,
    recordType: row.recordType,
    costSaving: String(row.costSaving),
    costAvoidance: String(row.costAvoidance),
    totalValueCreation: String(row.totalValueCreation),
    initialSum: String(row.initialSum),
    sumAfterSaving: String(row.sumAfterSaving),
    totalCostIncurred: String(row.totalCostIncurred),
    revenue: String(row.revenue),
    grossProfit: String(row.grossProfit),
    uploadedBy: session.user.id,
    sourceFile: file.name,
  }));

  const upserted = await db
    .insert(pnlData)
    .values(pnlValues)
    .onConflictDoUpdate({
      target: [pnlData.divisionId, pnlData.periodId, pnlData.recordType],
      set: {
        costSaving: sql`excluded.cost_saving`,
        costAvoidance: sql`excluded.cost_avoidance`,
        totalValueCreation: sql`excluded.total_value_creation`,
        initialSum: sql`excluded.initial_sum`,
        sumAfterSaving: sql`excluded.sum_after_saving`,
        totalCostIncurred: sql`excluded.total_cost_incurred`,
        revenue: sql`excluded.revenue`,
        grossProfit: sql`excluded.gross_profit`,
        uploadedBy: sql`excluded.uploaded_by`,
        sourceFile: sql`excluded.source_file`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: pnlData.id, divisionId: pnlData.divisionId, periodId: pnlData.periodId, recordType: pnlData.recordType });

  const pnlIdByKey = new Map(upserted.map((r) => [`${r.divisionId}|${r.periodId}|${r.recordType}`, r.id]));
  const idsInOrder = parsed.rows.map((row) => pnlIdByKey.get(`${divisionMap.get(row.division)}|${periodMap.get(row.periodLabel)}|${row.recordType}`)!);

  if (idsInOrder.length > 0) {
    await db.delete(costComponents).where(inArray(costComponents.pnlDataId, idsInOrder));

    const componentValues = parsed.rows.flatMap((row, i) =>
      Object.entries(row.costComponents).map(([key, amount], sortOrder) => ({
        pnlDataId: idsInOrder[i],
        componentKey: key,
        componentLabel: key,
        amount: String(amount ?? 0),
        sortOrder,
      }))
    );
    if (componentValues.length > 0) {
      await db.insert(costComponents).values(componentValues);
    }
  }

  const [upload] = await db
    .insert(dataUploads)
    .values({
      uploadedBy: session.user.id,
      filename: file.name,
      rowsProcessed: parsed.rows.length,
      divisionsUpdated: parsed.divisionsUpdated,
      periodsUpdated: parsed.periodsUpdated,
      status: "success",
      errorMessage: parsed.errors.length > 0 ? parsed.errors.join(" | ") : null,
    })
    .returning();

  await db.insert(userSessions).values({
    userId: session.user.id,
    actionType: "upload",
    payload: { filename: file.name, rowsProcessed: parsed.rows.length },
  });

  return NextResponse.json({
    upload_id: upload.id,
    rows_processed: parsed.rows.length,
    divisions: parsed.divisionsUpdated,
    periods: parsed.periodsUpdated,
    warnings: parsed.errors,
  });
}

async function resolveDivisions(rows: ParsedPnlRow[]): Promise<Map<string, string>> {
  const codes = [...new Set(rows.map((r) => r.division))];
  const existing = await db.query.divisions.findMany({ where: inArray(divisions.code, codes) });
  const map = new Map(existing.map((d) => [d.code, d.id]));

  const missing = codes.filter((c) => !map.has(c));
  if (missing.length > 0) {
    const created = await db
      .insert(divisions)
      .values(missing.map((code) => ({ code, name: code })))
      .onConflictDoNothing({ target: divisions.code })
      .returning();
    created.forEach((d) => map.set(d.code, d.id));

    const stillMissing = missing.filter((c) => !map.has(c));
    if (stillMissing.length > 0) {
      const refetched = await db.query.divisions.findMany({ where: inArray(divisions.code, stillMissing) });
      refetched.forEach((d) => map.set(d.code, d.id));
    }
  }
  return map;
}

async function resolvePeriods(rows: ParsedPnlRow[]): Promise<Map<string, string>> {
  const labels = [...new Set(rows.map((r) => r.periodLabel))];
  const existing = await db.query.periods.findMany({ where: inArray(periods.label, labels) });
  const map = new Map(existing.map((p) => [p.label, p.id]));

  const byLabel = new Map(rows.map((r) => [r.periodLabel, r]));
  const missing = labels.filter((l) => !map.has(l));
  if (missing.length > 0) {
    const created = await db
      .insert(periods)
      .values(
        missing.map((label) => {
          const r = byLabel.get(label)!;
          return { label, year: r.year, quarter: r.quarter, isFy: r.isFy, sortOrder: r.year * 10 + (r.quarter ?? 5) };
        })
      )
      .onConflictDoNothing({ target: periods.label })
      .returning();
    created.forEach((p) => map.set(p.label, p.id));

    const stillMissing = missing.filter((l) => !map.has(l));
    if (stillMissing.length > 0) {
      const refetched = await db.query.periods.findMany({ where: inArray(periods.label, stillMissing) });
      refetched.forEach((p) => map.set(p.label, p.id));
    }
  }
  return map;
}
