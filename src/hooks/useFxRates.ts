import { useQuery } from "@tanstack/react-query";
import type { FxRateRow } from "@/types";

export function useFxRates() {
  return useQuery({
    queryKey: ["fx-rates"],
    queryFn: async () => {
      const res = await fetch("/api/fx/rates");
      if (!res.ok) throw new Error("Failed to load FX rates");
      return res.json() as Promise<FxRateRow[]>;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useFxLive() {
  return useQuery({
    queryKey: ["fx-live"],
    queryFn: async () => {
      const res = await fetch("/api/fx/live");
      if (!res.ok) throw new Error("Live FX rate unavailable");
      return res.json() as Promise<{ rate: number; timestamp: string; source: string }>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
