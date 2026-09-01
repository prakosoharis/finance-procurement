"use client";

import { useFilterStore, type Division } from "@/store/useFilterStore";
import { cn } from "@/lib/utils";

const DIVISIONS: { value: Division; label: string }[] = [
  { value: "Combine", label: "Combine (All)" },
  { value: "SMM", label: "SMM" },
  { value: "SUN", label: "SUN" },
  { value: "OliveLink", label: "OliveLink" },
];
const YEARS = ["All", "2022", "2023", "2024", "2025", "2026"];
const QUARTERS = ["All", "Q1", "Q2", "Q3", "Q4", "FY"];

function PillGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}:</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "whitespace-nowrap rounded-[5px] border px-2.5 py-1 text-[11px] font-medium transition",
            value === o ? "border-teal bg-teal font-bold text-bg" : "border-border bg-transparent text-muted hover:bg-surface hover:text-text"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function FilterBar() {
  const { division, year, quarter, setDivision, setYear, setQuarter } = useFilterStore();

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b border-border bg-bg2 px-6 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Division:</span>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value as Division)}
          className="rounded-md border border-teal/30 bg-teal/[0.08] px-2.5 py-1 text-[11px] font-semibold text-teal outline-none"
        >
          {DIVISIONS.map((d) => (
            <option key={d.value} value={d.value} className="bg-bg3 text-text">
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="h-5 w-px bg-border" />
      <PillGroup label="Year" value={year} options={YEARS} onChange={setYear} />
      <div className="h-5 w-px bg-border" />
      <PillGroup label="Period" value={quarter} options={QUARTERS} onChange={setQuarter} />
    </div>
  );
}
