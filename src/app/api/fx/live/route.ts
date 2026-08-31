import { NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";

export const revalidate = 300; // 5 min ISR cache, mirrors tech spec §6.3

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const url = process.env.FX_API_URL || "https://open.er-api.com/v6/latest/USD";

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`FX provider responded ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.IDR;
    if (!rate) throw new Error("IDR rate missing from provider response");
    return NextResponse.json({ rate, timestamp: new Date().toISOString(), source: url });
  } catch {
    return NextResponse.json(
      { error: "Live FX rate unavailable, falling back to last known rate in fx_rates table", code: 502 },
      { status: 502 }
    );
  }
}
