import type { PnlRow } from "@/types";

/** Plain figure formatting used by the wide P&L tables: em-dash for ~zero, parentheses for negative. */
export function fmtNum(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) < 0.5 / 10 ** decimals) return "—";
  const abs = Math.abs(value).toFixed(decimals);
  return value < 0 ? `(${abs})` : abs;
}

export function moneyDecimals(currency: "USD" | "IDR") {
  return currency === "USD" ? 2 : 1;
}

export function unitLabel(currency: "USD" | "IDR") {
  return currency === "USD" ? "USD Mn" : "IDR Bn";
}

/**
 * Narrative money label, e.g. "$25.02 M" / "$3.50 B" (or "Rp… B" / "Rp… T" in IDR mode).
 * `value` is already in the display currency's base unit — USD millions or IDR billions —
 * and rolls up to the next unit past 1,000 so aggregate figures stay readable in prose.
 */
export function moneyLabel(value: number, currency: "USD" | "IDR"): string {
  const symbol = currency === "USD" ? "$" : "Rp";
  const [baseUnit, bigUnit] = currency === "USD" ? ["M", "B"] : ["B", "T"];
  const abs = Math.abs(value);
  if (abs >= 1000) return `${symbol}${(value / 1000).toFixed(2)} ${bigUnit}`;
  return `${symbol}${value.toFixed(2)} ${baseUnit}`;
}

/** KPI-tile precision: fewer decimals as magnitude grows, matching the reference tiles. */
export function kpiNum(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

/**
 * The period rows that should be *summed* for headline totals.
 *
 * The API can return quarters and the FY row for the same year, and FY is already the
 * sum of its quarters — adding both would double-count. Prefer quarters (which is also
 * what the reference dashboard counts in its "(N periods)" label) and fall back to FY
 * rows only when no quarterly data exists in scope.
 */
export function aggregationRows(rows: PnlRow[], recordType: "actual" | "budget"): PnlRow[] {
  const scoped = rows.filter((r) => r.recordType === recordType);
  const quarters = scoped.filter((r) => !r.isFy);
  return quarters.length > 0 ? quarters : scoped.filter((r) => r.isFy);
}

export function sumField(rows: PnlRow[], key: keyof PnlRow): number {
  return rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
}
