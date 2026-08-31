import { create } from "zustand";

export type Division = "Combine" | "SMM" | "SUN" | "OliveLink";
export type Currency = "USD" | "IDR";
export type ChartMetric = "sum" | "vc" | "nvc" | "cost";
export type PnlRepMode = "actual" | "budget" | "both";

interface FilterState {
  division: Division;
  year: string; // "All" | "2022".."2026"
  quarter: string; // "All" | "Q1".."Q4" | "FY"
  currency: Currency;
  chartMetric: ChartMetric;
  pnlRepMode: PnlRepMode;
  setDivision: (d: Division) => void;
  setYear: (y: string) => void;
  setQuarter: (q: string) => void;
  setCurrency: (c: Currency) => void;
  setChartMetric: (m: ChartMetric) => void;
  setPnlRepMode: (m: PnlRepMode) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  division: "Combine",
  year: "All",
  quarter: "All",
  currency: "USD",
  chartMetric: "sum",
  pnlRepMode: "both",
  setDivision: (division) => set({ division }),
  setYear: (year) => set({ year }),
  setQuarter: (quarter) => set({ quarter }),
  setCurrency: (currency) => set({ currency }),
  setChartMetric: (chartMetric) => set({ chartMetric }),
  setPnlRepMode: (pnlRepMode) => set({ pnlRepMode }),
}));
