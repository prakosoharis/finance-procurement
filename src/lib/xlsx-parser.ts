import * as XLSX from "xlsx-js-style";
import { COST_COMPONENT_DEFS, type CostComponentKey } from "@/lib/calculations";

const COLUMN_TO_COMPONENT: Record<string, CostComponentKey> = {
  Salaries: "salaries",
  "Housing Fund": "housing_fund",
  "Social Security": "social_security",
  "Rent Exp": "rent_exp",
  "Prof. Service Fee": "prof_service_fee",
  "Property Management Fee": "property_management_fee",
  "Legal Advisory Fee": "legal_advisory_fee",
  "Business Trip": "business_trip",
  "License & Permit": "license_permit",
  "IT Expense": "it_expense",
  Entertainment: "entertainment",
  "Office Expense": "office_expense",
  Communication: "communication",
  "Repair Maintenance": "repair_maintenance",
  Insurance: "insurance",
};

const REQUIRED_HEADERS = ["Business Unit", "Budget/Actual", "Period", "Year"];
const VALID_DIVISIONS = ["SMM", "SUN", "OliveLink"];
// Business units present in real source files that this dashboard doesn't track.
// Rows for these are dropped silently rather than treated as a validation error.
const IGNORED_DIVISIONS = ["EBER", "BSIM"];

export interface ParsedPnlRow {
  division: string;
  recordType: "actual" | "budget";
  periodLabel: string; // e.g. "Q1 2025" or "FY 2025"
  year: number;
  quarter: number | null;
  isFy: boolean;
  costSaving: number;
  costAvoidance: number;
  totalValueCreation: number;
  initialSum: number;
  sumAfterSaving: number;
  totalCostIncurred: number;
  revenue: number;
  grossProfit: number;
  costComponents: Partial<Record<CostComponentKey, number>>;
}

export interface ParseResult {
  rows: ParsedPnlRow[];
  errors: string[];
  divisionsUpdated: string[];
  periodsUpdated: string[];
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) return Number(value);
  return 0;
}

/** Source files commonly have padded header cells (" Business Unit " etc.) — normalize before matching. */
function normalizeHeaders(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.trim()] = value;
  }
  return out;
}

const emptyAggregate = () => ({
  costSaving: 0,
  costAvoidance: 0,
  totalValueCreation: 0,
  initialSum: 0,
  sumAfterSaving: 0,
  revenue: 0,
  grossProfit: 0,
  costComponents: Object.fromEntries(COST_COMPONENT_DEFS.map((d) => [d.key, 0])) as Record<CostComponentKey, number>,
});

export function parseWorkbook(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets["Database"];
  if (!sheet) {
    return { rows: [], errors: ["Could not find a sheet named 'Database'."], divisionsUpdated: [], periodsUpdated: [] };
  }

  const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
  if (rawJson.length === 0) {
    return { rows: [], errors: ["The Database sheet has no data rows."], divisionsUpdated: [], periodsUpdated: [] };
  }
  const json = rawJson.map(normalizeHeaders);

  const headers = Object.keys(json[0]);
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required column(s): ${missing.join(", ")}`], divisionsUpdated: [], periodsUpdated: [] };
  }

  const errors: string[] = [];
  // Source files carry one row per spend Category (GIL, IT, Belt, ...) for the same
  // division + period + Actual/Budget combo — this fact table is one row per that
  // combo, so rows sharing a key are summed together rather than overwriting each other.
  const groups = new Map<
    string,
    { division: string; recordType: "actual" | "budget"; periodLabel: string; year: number; quarter: number | null; isFy: boolean } & ReturnType<
      typeof emptyAggregate
    >
  >();

  json.forEach((raw, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexing
    const division = String(raw["Business Unit"] ?? "").trim();
    const budgetActual = String(raw["Budget/Actual"] ?? "").trim().toLowerCase();
    const periodRaw = String(raw["Period"] ?? "").trim().toUpperCase();
    const year = num(raw["Year"]);

    if (IGNORED_DIVISIONS.includes(division)) return;
    if (!VALID_DIVISIONS.includes(division)) {
      errors.push(`Row ${rowNum}: invalid Business Unit "${division}" (expected SMM, SUN, or OliveLink — do not include Combine rows).`);
      return;
    }
    if (budgetActual !== "actual" && budgetActual !== "budget") {
      errors.push(`Row ${rowNum}: Budget/Actual must be "Actual" or "Budget", got "${raw["Budget/Actual"]}".`);
      return;
    }
    if (!year || year < 2000 || year > 2100) {
      errors.push(`Row ${rowNum}: invalid Year "${raw["Year"]}".`);
      return;
    }

    let quarter: number | null = null;
    let isFy = false;
    if (periodRaw === "FY") {
      isFy = true;
    } else if (/^Q[1-4]$/.test(periodRaw)) {
      quarter = Number(periodRaw[1]);
    } else {
      errors.push(`Row ${rowNum}: Period must be Q1-Q4 or FY, got "${raw["Period"]}".`);
      return;
    }
    const periodLabel = isFy ? `FY ${year}` : `Q${quarter} ${year}`;
    const groupKey = `${division}|${budgetActual}|${periodLabel}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        division,
        recordType: budgetActual as "actual" | "budget",
        periodLabel,
        year,
        quarter,
        isFy,
        ...emptyAggregate(),
      });
    }
    const group = groups.get(groupKey)!;

    group.costSaving += num(raw["Cost Saving"]);
    group.costAvoidance += num(raw["Cost Avoidance"]);
    group.totalValueCreation += num(raw["Total Value Creation"]);
    group.initialSum += num(raw["Initial SUM"]);
    group.sumAfterSaving += num(raw["SUM after Saving"]);
    // Revenue/GP are recorded once per division+period+type (on a single summary row,
    // zero elsewhere in the source file), so summing across category rows is safe and
    // also self-corrects if a file ever repeats the same figure on every row.
    group.revenue += num(raw["Revenue"]);
    group.grossProfit += num(raw["GP"]);
    for (const def of COST_COMPONENT_DEFS) {
      const header = Object.keys(COLUMN_TO_COMPONENT).find((h) => COLUMN_TO_COMPONENT[h] === def.key)!;
      group.costComponents[def.key] += num(raw[header]);
    }
  });

  const rows: ParsedPnlRow[] = [];
  const divisionsUpdated = new Set<string>();
  const periodsUpdated = new Set<string>();

  for (const group of groups.values()) {
    const totalCostIncurred = Object.values(group.costComponents).reduce((a, b) => a + b, 0);
    rows.push({
      division: group.division,
      recordType: group.recordType,
      periodLabel: group.periodLabel,
      year: group.year,
      quarter: group.quarter,
      isFy: group.isFy,
      costSaving: group.costSaving,
      costAvoidance: group.costAvoidance,
      totalValueCreation: group.totalValueCreation,
      initialSum: group.initialSum,
      sumAfterSaving: group.sumAfterSaving,
      totalCostIncurred,
      revenue: group.revenue,
      grossProfit: group.grossProfit,
      costComponents: group.costComponents,
    });
    divisionsUpdated.add(group.division);
    periodsUpdated.add(group.periodLabel);
  }

  return { rows, errors, divisionsUpdated: [...divisionsUpdated], periodsUpdated: [...periodsUpdated] };
}
