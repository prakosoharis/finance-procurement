import type { CostComponentKey } from "@/lib/calculations";

export interface PnlRow {
  id: string;
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
  netValueCreation: number;
  roiPct: number;
  valueToSumPct: number;
  revenue: number;
  grossProfit: number;
  costComponents: Partial<Record<CostComponentKey, number>>;
}

export interface PnlSummaryBucket {
  totalValueCreation: number;
  totalCostIncurred: number;
  initialSum: number;
  netValueCreation: number;
  roiPct: number;
  valueToSumPct: number;
}

export interface PnlSummary {
  actual: PnlSummaryBucket;
  budget: PnlSummaryBucket;
  rowCount: number;
}

export interface FxRateRow {
  periodLabel: string;
  rateIdrPerUsd: number;
  rateDate: string;
  source: string;
}
