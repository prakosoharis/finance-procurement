import { useQuery } from "@tanstack/react-query";

export interface PeerRow {
  id: string;
  divisionScope: string;
  peerName: string;
  peerType: "named" | "body";
  roiMultiple: string;
  sourceLabel: string;
  sourceUrl: string | null;
  note: string | null;
}

export function usePeers(division: string) {
  return useQuery({
    queryKey: ["peers", division],
    queryFn: async () => {
      const res = await fetch(`/api/peers?division=${encodeURIComponent(division)}`);
      if (!res.ok) throw new Error("Failed to load peer benchmarks");
      return res.json() as Promise<PeerRow[]>;
    },
    staleTime: 30 * 60 * 1000,
  });
}
