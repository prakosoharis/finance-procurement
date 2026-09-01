"use client";

import { useFilterStore } from "@/store/useFilterStore";

export function CurrencyBanner() {
  const currency = useFilterStore((s) => s.currency);
  const isUsd = currency === "USD";

  return (
    <div
      className={`flex items-center gap-2.5 border-b border-border px-6 py-1.5 text-[11px] font-semibold ${
        isUsd ? "bg-blueHdr/5 text-[#93c5fd]" : "bg-orgHdr/5 text-[#fde68a]"
      }`}
    >
      <span>{isUsd ? "💵" : "💴"}</span>
      <span>
        Values in{" "}
        <span
          className={`rounded px-2.5 py-0.5 font-mono text-[11px] font-bold ${
            isUsd ? "bg-blueHdr/20 text-[#93c5fd]" : "bg-orgHdr/20 text-[#fde68a]"
          }`}
        >
          {isUsd ? "USD Million" : "IDR Billion"}
        </span>
      </span>
      <span className="ml-2.5 text-[10px] font-normal text-muted">
        Toggle to {isUsd ? "IDR" : "USD"} to convert using BI JISDOR rates
      </span>
      <span className="ml-auto text-[10px] text-muted">
        Source:{" "}
        <a href="https://www.bi.go.id" target="_blank" rel="noreferrer" className="text-teal">
          bi.go.id ↗
        </a>
      </span>
    </div>
  );
}
