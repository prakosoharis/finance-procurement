import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  accent = "teal",
}: {
  label: string;
  value: string;
  accent?: "teal" | "gold" | "green" | "red";
}) {
  const accentClass = {
    teal: "text-teal",
    gold: "text-gold",
    green: "text-green",
    red: "text-red",
  }[accent];

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 font-mono text-xl font-bold", accentClass)}>{value}</p>
    </div>
  );
}
