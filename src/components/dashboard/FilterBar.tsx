"use client";

import { useFilterStore, type Division, type Currency } from "@/store/useFilterStore";

const DIVISIONS: Division[] = ["Combine", "SMM", "SUN", "OliveLink"];
const YEARS = ["All", "2022", "2023", "2024", "2025", "2026"];
const QUARTERS = ["All", "Q1", "Q2", "Q3", "Q4", "FY"];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-border bg-bg3 px-2 py-1 text-xs text-text outline-none focus:border-teal"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar() {
  const { division, year, quarter, currency, setDivision, setYear, setQuarter, setCurrency } = useFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border bg-bg px-6 py-2.5">
      <Select label="Division" value={division} options={DIVISIONS} onChange={(v) => setDivision(v as Division)} />
      <Select label="Year" value={year} options={YEARS} onChange={setYear} />
      <Select label="Period" value={quarter} options={QUARTERS} onChange={setQuarter} />
      <Select label="Currency" value={currency} options={["USD", "IDR"]} onChange={(v) => setCurrency(v as Currency)} />
    </div>
  );
}
