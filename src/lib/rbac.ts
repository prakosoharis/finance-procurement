import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { allowedDivisionsFor, canUpload, canManageUsers, canExport, canEditFxRates, DEFAULT_VIEWER_SCOPE, type Role } from "@/lib/access";

export type { Role };
export { allowedDivisionsFor, canUpload, canManageUsers, canExport, canEditFxRates, DEFAULT_VIEWER_SCOPE };

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
