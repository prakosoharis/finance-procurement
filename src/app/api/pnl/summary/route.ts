import { NextRequest, NextResponse } from "next/server";
import { requireSession, allowedDivisionsFor } from "@/lib/rbac";
import { getPnlRows } from "@/lib/queries/pnl";
import { deriveMetrics } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const searchParams = req.nextUrl.searchParams;
  const division = searchParams.get("division") ?? undefined;
  const year = searchParams.get("year") ?? undefined;
  const quarter = searchParams.get("quarter") ?? undefined;

  const allowed = allowedDivisionsFor(session.user);
  const rows = await getPnlRows({ divisions: allowed, divisionParam: division, year, quarter });

  const actual = rows.filter((r) => r.recordType === "actual");
  const budget = rows.filter((r) => r.recordType === "budget");

  const sum = (arr: typeof rows, key: keyof (typeof rows)[number]) =>
    arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

  const actualAgg = {
    totalValueCreation: sum(actual, "totalValueCreation"),
    totalCostIncurred: sum(actual, "totalCostIncurred"),
    initialSum: sum(actual, "initialSum"),
  };
  const budgetAgg = {
    totalValueCreation: sum(budget, "totalValueCreation"),
    totalCostIncurred: sum(budget, "totalCostIncurred"),
    initialSum: sum(budget, "initialSum"),
  };

  return NextResponse.json({
    actual: { ...actualAgg, ...deriveMetrics({ ...actualAgg, costSaving: 0, costAvoidance: 0, sumAfterSaving: 0, revenue: 0, grossProfit: 0 }) },
    budget: { ...budgetAgg, ...deriveMetrics({ ...budgetAgg, costSaving: 0, costAvoidance: 0, sumAfterSaving: 0, revenue: 0, grossProfit: 0 }) },
    rowCount: rows.length,
  });
}
