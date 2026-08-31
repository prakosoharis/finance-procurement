import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export type Role = "admin" | "manager" | "viewer";

/** Divisions a viewer with no explicit division_access can see. */
export const DEFAULT_VIEWER_SCOPE = ["Combine"];

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized", code: 401 }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireRole(...roles: Role[]) {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (!roles.includes(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden — insufficient role", code: 403 }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/** Divisions a given session is allowed to read. `null` means "all divisions". */
export function allowedDivisionsFor(session: { user: { role: Role; divisionAccess: string[] } }): string[] | null {
  if (session.user.role === "admin" || session.user.role === "manager") return null;
  return session.user.divisionAccess.length > 0 ? session.user.divisionAccess : DEFAULT_VIEWER_SCOPE;
}

export function canUpload(role: Role) {
  return role === "admin";
}

export function canManageUsers(role: Role) {
  return role === "admin";
}

export function canExport(role: Role) {
  return role === "admin" || role === "manager";
}

export function canEditFxRates(role: Role) {
  return role === "admin";
}
