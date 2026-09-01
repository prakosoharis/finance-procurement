import { cn } from "@/lib/utils";

/**
 * Generic content card ("section-card" in the reference design). Carries `data-ui="card"`
 * so the active theme (see globals.css) can re-skin it — flat/bordered by default,
 * neumorphic in Skeuomorphism, hard-shadow in Neo-Brutalism, gradient-bordered in Y2K, etc.
 */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div data-ui="card" className={cn("overflow-hidden rounded-xl border border-border bg-bg2", className)}>
      {children}
    </div>
  );
}

export function CardBar({ children }: { children: React.ReactNode }) {
  return (
    <div data-ui="card-bar" className="flex flex-wrap items-center gap-2.5 border-b border-border bg-black/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-light">
      {children}
    </div>
  );
}
