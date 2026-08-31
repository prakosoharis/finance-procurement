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

export function parseWorkbook(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets["Database"];
  if (!sheet) {
    return { rows: [], errors: ["Could not find a sheet named 'Database'."], divisionsUpdated: [], periodsUpdated: [] };
  }

  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
  if (json.length === 0) {
    return { rows: [], errors: ["The Database sheet has no data rows."], divisionsUpdated: [], periodsUpdated: [] };
  }

  const headers = Object.keys(json[0]);
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { rows: [], errors: [`Missing required column(s): ${missing.join(", ")}`], divisionsUpdated: [], periodsUpdated: [] };
  }

  const errors: string[] = [];
  const rows: ParsedPnlRow[] = [];
  const divisionsUpdated = new Set<string>();
  const periodsUpdated = new Set<string>();

  json.forEach((raw, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexing
    const division = String(raw["Business Unit"] ?? "").trim();
    const budgetActual = String(raw["Budget/Actual"] ?? "").trim().toLowerCase();
    const periodRaw = String(raw["Period"] ?? "").trim().toUpperCase();
    const year = num(raw["Year"]);

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

    const costComponents: Partial<Record<CostComponentKey, number>> = {};
    let totalCostIncurred = 0;
    for (const def of COST_COMPONENT_DEFS) {
      const header = Object.keys(COLUMN_TO_COMPONENT).find((h) => COLUMN_TO_COMPONENT[h] === def.key)!;
      const amount = num(raw[header]);
      costComponents[def.key] = amount;
      totalCostIncurred += amount;
    }

    rows.push({
      division,
      recordType: budgetActual as "actual" | "budget",
      periodLabel,
      year,
      quarter,
      isFy,
      costSaving: num(raw["Cost Saving"]),
      costAvoidance: num(raw["Cost Avoidance"]),
      totalValueCreation: num(raw["Total Value Creation"]),
      initialSum: num(raw["Initial SUM"]),
      sumAfterSaving: num(raw["SUM after Saving"]),
      totalCostIncurred,
      revenue: num(raw["Revenue"]),
      grossProfit: num(raw["GP"]),
      costComponents,
    });
    divisionsUpdated.add(division);
    periodsUpdated.add(periodLabel);
  });

  return { rows, errors, divisionsUpdated: [...divisionsUpdated], periodsUpdated: [...periodsUpdated] };
}
