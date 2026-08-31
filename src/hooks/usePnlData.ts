import { useQuery } from "@tanstack/react-query";
import type { PnlRow, PnlSummary } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function usePnlData(params: { division: string; year: string; quarter: string; type?: "actual" | "budget" }) {
  const search = new URLSearchParams({ division: params.division, year: params.year, quarter: params.quarter });
  if (params.type) search.set("type", params.type);

  return useQuery({
    queryKey: ["pnl", params.division, params.year, params.quarter, params.type],
    queryFn: () => fetchJson<PnlRow[]>(`/api/pnl?${search.toString()}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePnlSummary(params: { division: string; year: string; quarter: string }) {
  const search = new URLSearchParams({ division: params.division, year: params.year, quarter: params.quarter });
  return useQuery({
    queryKey: ["pnl-summary", params.division, params.year, params.quarter],
    queryFn: () => fetchJson<PnlSummary>(`/api/pnl/summary?${search.toString()}`),
    staleTime: 5 * 60 * 1000,
  });
}
