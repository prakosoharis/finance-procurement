import { db } from "@/lib/db";
import { pnlData, divisions, periods, costComponents } from "@/lib/db/schema";
import { and, eq, inArray, SQL } from "drizzle-orm";
import { combineRows, deriveMetrics, type CostComponentKey } from "@/lib/calculations";
import type { PnlRow } from "@/types";

interface PnlFilter {
  divisions: string[] | null; // null = all divisions (admin/manager), else RBAC-restricted list
  divisionParam?: string; // requested division filter from the UI ("Combine" | "SMM" | ...)
  year?: string; // "All" | "2022".."2026"
  quarter?: string; // "All" | "Q1".."Q4" | "FY"
  recordType?: "actual" | "budget";
}

function toPnlRow(args: {
  division: string;
  periodLabel: string;
  year: number;
  quarter: number | null;
  isFy: boolean;
  recordType: "actual" | "budget";
  costSaving: number;
  costAvoidance: number;
  totalValueCreation: number;
  initialSum: number;
  sumAfterSaving: number;
  totalCostIncurred: number;
  revenue: number;
  grossProfit: number;
  costComponents: Partial<Record<CostComponentKey, number>>;
  id: string;
}): PnlRow {
  const { netValueCreation, roiPct, valueToSumPct } = deriveMetrics(args);
  return { ...args, netValueCreation, roiPct, valueToSumPct };
}

/**
 * Fetches P&L rows joined with divisions/periods/cost components, applying RBAC scoping
 * and UI filters. When the UI requests the virtual "Combine" division, real division rows
 * are summed in application code (Combine is never stored — see divisions.is_virtual).
 */
export async function getPnlRows(filter: PnlFilter): Promise<PnlRow[]> {
  const conditions: SQL[] = [];

  const realDivisions = filter.divisions?.filter((d) => d !== "Combine") ?? null;
  if (realDivisions) {
    if (realDivisions.length === 0) return [];
    conditions.push(inArray(divisions.code, realDivisions));
  }
  if (filter.divisionParam && filter.divisionParam !== "All" && filter.divisionParam !== "Combine") {
    conditions.push(eq(divisions.code, filter.divisionParam));
  }
  if (filter.year && filter.year !== "All") {
    conditions.push(eq(periods.year, Number(filter.year)));
  }
  if (filter.quarter && filter.quarter !== "All") {
    if (filter.quarter === "FY") {
      conditions.push(eq(periods.isFy, true));
    } else {
      conditions.push(eq(periods.quarter, Number(filter.quarter.replace("Q", ""))));
      conditions.push(eq(periods.isFy, false));
    }
  }
  if (filter.recordType) {
    conditions.push(eq(pnlData.recordType, filter.recordType));
  }

  const rows = await db
    .select({
      id: pnlData.id,
      division: divisions.code,
      periodLabel: periods.label,
      year: periods.year,
      quarter: periods.quarter,
      isFy: periods.isFy,
      recordType: pnlData.recordType,
      costSaving: pnlData.costSaving,
      costAvoidance: pnlData.costAvoidance,
      totalValueCreation: pnlData.totalValueCreation,
      initialSum: pnlData.initialSum,
      sumAfterSaving: pnlData.sumAfterSaving,
      totalCostIncurred: pnlData.totalCostIncurred,
      revenue: pnlData.revenue,
      grossProfit: pnlData.grossProfit,
    })
    .from(pnlData)
    .innerJoin(divisions, eq(pnlData.divisionId, divisions.id))
    .innerJoin(periods, eq(pnlData.periodId, periods.id))
    .where(conditions.length ? and(...conditions) : undefined);

  if (rows.length === 0) return [];

  const componentRows = await db
    .select({
      pnlDataId: costComponents.pnlDataId,
      componentKey: costComponents.componentKey,
      amount: costComponents.amount,
    })
    .from(costComponents)
    .where(
      inArray(
        costComponents.pnlDataId,
        rows.map((r) => r.id)
      )
    );

  const componentsByRow = new Map<string, Partial<Record<CostComponentKey, number>>>();
  for (const c of componentRows) {
    const bucket = componentsByRow.get(c.pnlDataId) ?? {};
    bucket[c.componentKey as CostComponentKey] = Number(c.amount);
    componentsByRow.set(c.pnlDataId, bucket);
  }

  const pnlRows = rows.map((r) =>
    toPnlRow({
      id: r.id,
      division: r.division,
      periodLabel: r.periodLabel,
      year: r.year,
      quarter: r.quarter,
      isFy: r.isFy,
      recordType: r.recordType,
      costSaving: Number(r.costSaving),
      costAvoidance: Number(r.costAvoidance),
      totalValueCreation: Number(r.totalValueCreation),
      initialSum: Number(r.initialSum),
      sumAfterSaving: Number(r.sumAfterSaving),
      totalCostIncurred: Number(r.totalCostIncurred),
      revenue: Number(r.revenue),
      grossProfit: Number(r.grossProfit),
      costComponents: componentsByRow.get(r.id) ?? {},
    })
  );

  // Build the synthetic "Combine" division by summing SMM+SUN+OliveLink per (period, recordType).
  if (!filter.divisionParam || filter.divisionParam === "All" || filter.divisionParam === "Combine") {
    const groups = new Map<string, PnlRow[]>();
    for (const r of pnlRows) {
      const key = `${r.periodLabel}__${r.recordType}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    const combined: PnlRow[] = [];
    for (const [key, group] of groups) {
      if (group.length === 0) continue;
      const [periodLabel, recordType] = key.split("__");
      const sums = combineRows(group);
      const componentTotals: Partial<Record<CostComponentKey, number>> = {};
      for (const r of group) {
        for (const [k, v] of Object.entries(r.costComponents)) {
          componentTotals[k as CostComponentKey] = (componentTotals[k as CostComponentKey] ?? 0) + (v ?? 0);
        }
      }
      combined.push(
        toPnlRow({
          id: `combine__${key}`,
          division: "Combine",
          periodLabel,
          year: group[0].year,
          quarter: group[0].quarter,
          isFy: group[0].isFy,
          recordType: recordType as "actual" | "budget",
          ...sums,
          costComponents: componentTotals,
        })
      );
    }
    if (filter.divisionParam === "Combine") return combined;
    if (!filter.divisionParam || filter.divisionParam === "All") return [...pnlRows, ...combined];
  }

  return pnlRows;
}
