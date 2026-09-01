import { NextRequest, NextResponse } from "next/server";
import { requireSession, allowedDivisionsFor } from "@/lib/rbac";
import { getPnlRows } from "@/lib/queries/pnl";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const searchParams = req.nextUrl.searchParams;
  const division = searchParams.get("division") ?? undefined;
  const year = searchParams.get("year") ?? undefined;
  const quarter = searchParams.get("quarter") ?? undefined;
  const type = searchParams.get("type") as "actual" | "budget" | undefined;

  const allowed = allowedDivisionsFor(session.user);
  if (allowed && division && division !== "All" && !allowed.includes(division)) {
    return NextResponse.json({ error: "Forbidden — insufficient role", code: 403 }, { status: 403 });
  }

  const rows = await getPnlRows({
    divisions: allowed,
    divisionParam: division,
    year,
    quarter,
    recordType: type,
  });

  return NextResponse.json(rows);
}
