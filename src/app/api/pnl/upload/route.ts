import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { divisions, periods, pnlData, costComponents, dataUploads, userSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseWorkbook } from "@/lib/xlsx-parser";

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

  const divisionCache = new Map<string, string>();
  const periodCache = new Map<string, string>();

  for (const row of parsed.rows) {
    let divisionId = divisionCache.get(row.division);
    if (!divisionId) {
      const existing = await db.query.divisions.findFirst({ where: eq(divisions.code, row.division) });
      divisionId = existing?.id ?? (await db.insert(divisions).values({ code: row.division, name: row.division }).returning())[0].id;
      divisionCache.set(row.division, divisionId);
    }

    let periodId = periodCache.get(row.periodLabel);
    if (!periodId) {
      const existing = await db.query.periods.findFirst({ where: eq(periods.label, row.periodLabel) });
      periodId =
        existing?.id ??
        (
          await db
            .insert(periods)
            .values({
              label: row.periodLabel,
              year: row.year,
              quarter: row.quarter,
              isFy: row.isFy,
              sortOrder: row.year * 10 + (row.quarter ?? 5),
            })
            .returning()
        )[0].id;
      periodCache.set(row.periodLabel, periodId);
    }

    const [upserted] = await db
      .insert(pnlData)
      .values({
        divisionId,
        periodId,
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
      })
      .onConflictDoUpdate({
        target: [pnlData.divisionId, pnlData.periodId, pnlData.recordType],
        set: {
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
          updatedAt: new Date(),
        },
      })
      .returning({ id: pnlData.id });

    await db.delete(costComponents).where(eq(costComponents.pnlDataId, upserted.id));
    const componentRows = Object.entries(row.costComponents).map(([key, amount], i) => ({
      pnlDataId: upserted.id,
      componentKey: key,
      componentLabel: key,
      amount: String(amount ?? 0),
      sortOrder: i,
    }));
    if (componentRows.length > 0) {
      await db.insert(costComponents).values(componentRows);
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
      status: parsed.errors.length > 0 ? "success" : "success",
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
