"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "./FilterBar";
import { UploadDialog } from "./UploadDialog";
import { useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

interface ShellUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "manager" | "viewer";
}

const TABS = [
  { href: "/dashboard", label: "Actual vs Target" },
  { href: "/dashboard/pnl-report", label: "P&L + ROI Report" },
  { href: "/dashboard/charts", label: "Charts" },
  { href: "/dashboard/fx-rates", label: "BI FX Rates" },
  { href: "/dashboard/peers", label: "Peer Parity" },
  { href: "/dashboard/ai-assistant", label: "AI Assistant" },
];

export function Shell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const setUploadOpen = useUiStore((s) => s.setUploadOpen);

  const tabs = user.role === "admin" ? [...TABS, { href: "/dashboard/users", label: "Permissions" }] : TABS;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#0d1a2e] to-[#111f35] px-6 py-3">
        <div>
          <h1 className="bg-gradient-to-r from-[#e2eaf5] to-teal bg-clip-text text-base font-bold text-transparent">
            Procurement P&amp;L Intelligence Dashboard
          </h1>
          <p className="text-[11px] text-muted">Berau Coal Energy · SMM · SUN · OliveLink</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {user.role === "admin" && (
            <button
              onClick={() => setUploadOpen(true)}
              className="rounded-md bg-green px-3 py-1.5 font-semibold text-bg hover:brightness-110"
            >
              📂 Upload XLS
            </button>
          )}
          <span className="text-light">
            {user.name} <span className="text-muted">({user.role})</span>
          </span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-md border border-border px-3 py-1.5 text-muted hover:text-text">
            Sign out
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border bg-bg2 px-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-3 py-2.5 text-xs font-medium transition",
                active ? "border-teal text-teal" : "border-transparent text-muted hover:text-light"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <FilterBar />

      <main className="p-6">{children}</main>

      {user.role === "admin" && <UploadDialog />}
    </div>
  );
}
