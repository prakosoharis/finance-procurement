import { NextRequest, NextResponse } from "next/server";
import { requireSession, allowedDivisionsFor } from "@/lib/rbac";
import { getPnlRows } from "@/lib/queries/pnl";
import { deriveMetrics } from "@/lib/calculations";
import { aggregationRows, sumField } from "@/lib/format";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const searchParams = req.nextUrl.searchParams;
  const division = searchParams.get("division") ?? undefined;
  const year = searchParams.get("year") ?? undefined;
  const quarter = searchParams.get("quarter") ?? undefined;

  const allowed = allowedDivisionsFor(session.user);
  const rows = await getPnlRows({ divisions: allowed, divisionParam: division, year, quarter });

  // Quarters and the FY row for the same year are both in scope, and FY is already the
  // sum of its quarters — summing everything double-counted every headline KPI.
  // aggregationRows() picks quarters when present, FY rows only as a fallback.
  const actual = aggregationRows(rows, "actual");
  const budget = aggregationRows(rows, "budget");

  const agg = (list: typeof rows) => ({
    totalValueCreation: sumField(list, "totalValueCreation"),
    totalCostIncurred: sumField(list, "totalCostIncurred"),
    initialSum: sumField(list, "initialSum"),
  });

  const actualAgg = agg(actual);
  const budgetAgg = agg(budget);

  const periodLabels = [...actual].sort((a, b) => a.year - b.year || (a.quarter ?? 5) - (b.quarter ?? 5)).map((r) => r.periodLabel);

  return NextResponse.json({
    actual: { ...actualAgg, ...deriveMetrics({ ...actualAgg, costSaving: 0, costAvoidance: 0, sumAfterSaving: 0, revenue: 0, grossProfit: 0 }) },
    budget: { ...budgetAgg, ...deriveMetrics({ ...budgetAgg, costSaving: 0, costAvoidance: 0, sumAfterSaving: 0, revenue: 0, grossProfit: 0 }) },
    rowCount: actual.length,
    periodFrom: periodLabels[0] ?? null,
    periodTo: periodLabels[periodLabels.length - 1] ?? null,
  });
}
