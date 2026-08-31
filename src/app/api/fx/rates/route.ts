import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { fxRates, periods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const rows = await db
    .select({
      periodLabel: periods.label,
      rateIdrPerUsd: fxRates.rateIdrPerUsd,
      rateDate: fxRates.rateDate,
      source: fxRates.source,
    })
    .from(fxRates)
    .innerJoin(periods, eq(fxRates.periodId, periods.id))
    .orderBy(periods.sortOrder);

  return NextResponse.json(rows);
}

const upsertSchema = z.object({
  periodLabel: z.string(),
  rateIdrPerUsd: z.number().positive(),
  rateDate: z.string(),
});

export async function POST(req: NextRequest) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: 422, details: parsed.error.flatten() }, { status: 422 });
  }

  const period = await db.query.periods.findFirst({ where: eq(periods.label, parsed.data.periodLabel) });
  if (!period) {
    return NextResponse.json({ error: "Unknown period", code: 422 }, { status: 422 });
  }

  await db
    .insert(fxRates)
    .values({
      periodId: period.id,
      rateIdrPerUsd: String(parsed.data.rateIdrPerUsd),
      rateDate: new Date(parsed.data.rateDate),
    })
    .onConflictDoUpdate({
      target: fxRates.periodId,
      set: { rateIdrPerUsd: String(parsed.data.rateIdrPerUsd), rateDate: new Date(parsed.data.rateDate) },
    });

  return NextResponse.json({ success: true });
}
