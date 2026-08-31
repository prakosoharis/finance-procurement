import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { benchmarkPeers } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const division = req.nextUrl.searchParams.get("division") ?? "All";

  const rows = await db
    .select()
    .from(benchmarkPeers)
    .where(
      and(
        eq(benchmarkPeers.isActive, true),
        division === "All" ? undefined : or(eq(benchmarkPeers.divisionScope, division), eq(benchmarkPeers.divisionScope, "All"))
      )
    );

  return NextResponse.json(rows);
}
