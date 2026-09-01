"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "./FilterBar";
import { CurrencyBanner } from "./CurrencyBanner";
import { KpiStrip } from "./KpiStrip";
import { UploadDialog } from "./UploadDialog";
import { useUiStore } from "@/store/useUiStore";
import { useFilterStore } from "@/store/useFilterStore";
import { useThemeStore, THEMES } from "@/store/useThemeStore";
import { usePnlData } from "@/hooks/usePnlData";
import { useFxLive } from "@/hooks/useFxRates";
import { cn } from "@/lib/utils";

interface ShellUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "manager" | "viewer";
}

const TABS = [
  { href: "/dashboard", label: "Actual vs Target" },
  { href: "/dashboard/pnl", label: "P&L + ROI" },
  { href: "/dashboard/pnl-report", label: "📋 P&L + ROI Report" },
  { href: "/dashboard/charts", label: "Charts" },
  { href: "/dashboard/fx-rates", label: "📊 BI FX Rates" },
  { href: "/dashboard/yoy", label: "📈 YoY Comparison" },
  { href: "/dashboard/insights", label: "Insights" },
  { href: "/dashboard/ratios", label: "📊 Ratio to Revenue & GP" },
  { href: "/dashboard/peers", label: "🌍 Peer Parity" },
  { href: "/dashboard/ai-assistant", label: "🤖 AI Assistant" },
];

export function Shell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const setUploadOpen = useUiStore((s) => s.setUploadOpen);
  const { division, year, quarter, currency, setCurrency } = useFilterStore();
  const { theme, setTheme } = useThemeStore();
  const { data: rows } = usePnlData({ division, year, quarter });
  const { data: live } = useFxLive();
  const rate = live?.rate ?? 0;

  const tabs = user.role === "admin" ? [...TABS, { href: "/dashboard/users", label: "🔐 Permissions" }] : TABS;
  const scopeLabel = `${division} · ${year === "All" ? "All Years" : year} · ${quarter === "All" ? "All Quarters" : quarter}`;

  return (
    <div className="min-h-screen bg-bg">
      <header data-ui="header" className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-gradient-to-r from-[#0d1a2e] to-[#111f35] px-6 py-3.5">
        <div>
          <h1 data-ui="header-title" className="bg-gradient-to-r from-[#e2eaf5] to-teal bg-clip-text text-[17px] font-bold tracking-tight text-transparent">
            Procurement P&amp;L Dashboard
          </h1>
          <p data-ui="header-sub" className="mt-0.5 text-[10px] text-muted">
            Division: {division} · {year === "All" ? "All Years" : year} · {quarter === "All" ? "All Quarters" : quarter} · Berau Coal Energy · BI JISDOR
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Theme:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as (typeof THEMES)[number]["id"])}
              className="rounded-md border border-border bg-bg3 px-2 py-1 text-[11px] font-semibold text-text outline-none"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id} className="bg-bg3 text-text">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Currency:</span>
            <div className="flex gap-0.5 rounded-lg border border-border bg-bg3 p-[3px]">
              <button
                onClick={() => setCurrency("USD")}
                className={cn(
                  "rounded-[5px] px-3 py-1 text-[11px] font-bold transition",
                  currency === "USD" ? "bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white shadow" : "text-[#60a5fa]"
                )}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency("IDR")}
                className={cn(
                  "rounded-[5px] px-3 py-1 text-[11px] font-bold transition",
                  currency === "IDR" ? "bg-gradient-to-br from-[#d97706] to-[#f59e0b] text-white shadow" : "text-[#fbbf24]"
                )}
              >
                IDR
              </button>
            </div>
            <div className="rounded-[5px] border border-border bg-bg3 px-1.5 py-1 font-mono text-[10px] text-muted">
              1 USD = {live ? live.rate.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "…"} IDR
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {user.role === "admin" && (
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-1 rounded-[7px] border border-green/30 bg-bg3 px-3 py-1.5 text-[11px] font-semibold text-green transition hover:bg-green/[0.08]"
              >
                📂 Upload XLS
              </button>
            )}
            <button
              onClick={async () => {
                if (!rows || rows.length === 0) return;
                const { exportPnlToXlsx } = await import("@/lib/export-xlsx");
                exportPnlToXlsx(rows, scopeLabel);
              }}
              disabled={!rows || rows.length === 0}
              className="inline-flex items-center gap-1 rounded-[7px] border border-teal/30 bg-bg3 px-3 py-1.5 text-[11px] font-semibold text-teal transition hover:bg-teal/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⬇ Excel
            </button>
            <button
              onClick={async () => {
                if (!rows || rows.length === 0) return;
                const { exportPnlToPdf } = await import("@/lib/export-pdf");
                exportPnlToPdf(rows, scopeLabel);
              }}
              disabled={!rows || rows.length === 0}
              className="inline-flex items-center gap-1 rounded-[7px] border border-purple/30 bg-bg3 px-3 py-1.5 text-[11px] font-semibold text-purple transition hover:bg-purple/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⬇ PDF
            </button>
            <button
              onClick={async () => {
                if (!rows || rows.length === 0) return;
                const { exportPnlToPptx } = await import("@/lib/export-pptx");
                exportPnlToPptx(rows, scopeLabel, currency, rate);
              }}
              disabled={!rows || rows.length === 0}
              className="inline-flex items-center gap-1 rounded-[7px] border border-gold/30 bg-bg3 px-3 py-1.5 text-[11px] font-semibold text-gold transition hover:bg-gold/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⬇ PPT
            </button>
          </div>
          <span className="text-xs text-light">
            {user.name} <span className="text-muted">({user.role})</span>
          </span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-text">
            Sign out
          </button>
        </div>
      </header>

      <CurrencyBanner />

      <FilterBar />

      <nav data-ui="tab-nav" className="flex gap-0 overflow-x-auto border-b border-border bg-bg2 px-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-ui="tab"
              data-active={active}
              className={cn(
                "whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-medium transition",
                active ? "border-teal text-teal" : "border-transparent text-muted hover:text-text"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto max-w-[1900px] px-6 py-5">
        <KpiStrip />
        {children}
      </main>

      {user.role === "admin" && <UploadDialog />}
    </div>
  );
}
