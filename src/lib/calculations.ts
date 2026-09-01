export const COST_COMPONENT_DEFS = [
  { key: "salaries", label: "Salaries" },
  { key: "housing_fund", label: "Housing Fund" },
  { key: "social_security", label: "Social Security" },
  { key: "rent_exp", label: "Rent Exp" },
  { key: "prof_service_fee", label: "Prof. Service Fee" },
  { key: "property_management_fee", label: "Property Management Fee" },
  { key: "legal_advisory_fee", label: "Legal Advisory Fee" },
  { key: "business_trip", label: "Business Trip" },
  { key: "license_permit", label: "License & Permit" },
  { key: "it_expense", label: "IT Expense" },
  { key: "entertainment", label: "Entertainment" },
  { key: "office_expense", label: "Office Expense" },
  { key: "communication", label: "Communication" },
  { key: "repair_maintenance", label: "Repair Maintenance" },
  { key: "insurance", label: "Insurance" },
] as const;

export type CostComponentKey = (typeof COST_COMPONENT_DEFS)[number]["key"];

export const ROI_BENCHMARKS = [
  { label: "World Class", min: 900, color: "green" },
  { label: "Excellent", min: 500, max: 900, color: "teal" },
  { label: "Good", min: 300, max: 500, color: "gold" },
  { label: "Average", min: 100, max: 300, color: "muted" },
  { label: "Below Avg", min: -Infinity, max: 100, color: "red" },
] as const;

/** Hackett Group benchmark tiers: ROI = Net Value Creation ÷ Total Cost Incurred. */
export function roiBenchmarkFor(roiPct: number) {
  if (roiPct >= 900) return ROI_BENCHMARKS[0];
  if (roiPct >= 500) return ROI_BENCHMARKS[1];
  if (roiPct >= 300) return ROI_BENCHMARKS[2];
  if (roiPct >= 100) return ROI_BENCHMARKS[3];
  return ROI_BENCHMARKS[4];
}

export const VSR_BENCHMARKS = [
  { label: "World Class", min: 6, color: "green" },
  { label: "Excellent", min: 4, max: 6, color: "teal" },
  { label: "Good", min: 2, max: 4, color: "gold" },
  { label: "Average", min: 1, max: 2, color: "muted" },
  { label: "Below Avg", min: -Infinity, max: 1, color: "red" },
] as const;

/** Ardent Partners / CAPS / Bain benchmark tiers: Value to SUM = Value Creation ÷ Initial SUM. */
export function vsrBenchmarkFor(vsrPct: number) {
  if (vsrPct >= 6) return VSR_BENCHMARKS[0];
  if (vsrPct >= 4) return VSR_BENCHMARKS[1];
  if (vsrPct >= 2) return VSR_BENCHMARKS[2];
  if (vsrPct >= 1) return VSR_BENCHMARKS[3];
  return VSR_BENCHMARKS[4];
}

export interface PnlAggregate {
  costSaving: number;
  costAvoidance: number;
  totalValueCreation: number;
  initialSum: number;
  sumAfterSaving: number;
  totalCostIncurred: number;
  revenue: number;
  grossProfit: number;
}

export function deriveMetrics(row: PnlAggregate) {
  const netValueCreation = row.totalValueCreation - row.totalCostIncurred;
  const roiPct = row.totalCostIncurred > 0 ? (netValueCreation / row.totalCostIncurred) * 100 : 0;
  const valueToSumPct = row.initialSum > 0 ? (row.totalValueCreation / row.initialSum) * 100 : 0;
  return { netValueCreation, roiPct, valueToSumPct };
}

/** Sums multiple division rows for the same period into a synthetic "Combine" row. */
export function combineRows(rows: PnlAggregate[]): PnlAggregate {
  return rows.reduce<PnlAggregate>(
    (acc, r) => ({
      costSaving: acc.costSaving + r.costSaving,
      costAvoidance: acc.costAvoidance + r.costAvoidance,
      totalValueCreation: acc.totalValueCreation + r.totalValueCreation,
      initialSum: acc.initialSum + r.initialSum,
      sumAfterSaving: acc.sumAfterSaving + r.sumAfterSaving,
      totalCostIncurred: acc.totalCostIncurred + r.totalCostIncurred,
      revenue: acc.revenue + r.revenue,
      grossProfit: acc.grossProfit + r.grossProfit,
    }),
    {
      costSaving: 0,
      costAvoidance: 0,
      totalValueCreation: 0,
      initialSum: 0,
      sumAfterSaving: 0,
      totalCostIncurred: 0,
      revenue: 0,
      grossProfit: 0,
    }
  );
}

export function formatUsdMn(value: number) {
  return `$${value.toFixed(2)}Mn`;
}

export function formatIdrBn(value: number, rateIdrPerUsd: number) {
  const idrBn = (value * rateIdrPerUsd) / 1000;
  return `Rp${idrBn.toFixed(2)}Bn`;
}

export function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

/** USD-million figures converted to IDR-billion using the active rate, or left as-is for USD mode. */
export function convertValue(usdMnValue: number, currency: "USD" | "IDR", rateIdrPerUsd: number) {
  return currency === "IDR" ? (usdMnValue * rateIdrPerUsd) / 1000 : usdMnValue;
}

export function formatMoney(usdMnValue: number, currency: "USD" | "IDR", rateIdrPerUsd: number) {
  const converted = convertValue(usdMnValue, currency, rateIdrPerUsd);
  return currency === "IDR" ? `Rp${converted.toFixed(2)}Bn` : `$${converted.toFixed(2)}Mn`;
}
