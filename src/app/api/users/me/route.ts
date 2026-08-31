import { NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { dashboardPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const prefs = await db.query.dashboardPreferences.findFirst({
    where: eq(dashboardPreferences.userId, session.user.id),
  });

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.name,
    role: session.user.role,
    divisionAccess: session.user.divisionAccess,
    preferences: prefs ?? null,
  });
}
