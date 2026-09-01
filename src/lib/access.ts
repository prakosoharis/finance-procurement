/**
 * Pure RBAC helpers with no server-only imports (unlike rbac.ts, which pulls in
 * next-auth's getServerSession) — safe to import from client components, e.g. the
 * Permissions "Preview as" simulator.
 */
export type Role = "admin" | "manager" | "viewer";

/** Divisions a viewer with no explicit division_access can see. */
export const DEFAULT_VIEWER_SCOPE = ["Combine"];

/** Divisions a given session is allowed to read. `null` means "all divisions". */
export function allowedDivisionsFor(user: { role: Role; divisionAccess: string[] }): string[] | null {
  if (user.role === "admin" || user.role === "manager") return null;
  return user.divisionAccess.length > 0 ? user.divisionAccess : DEFAULT_VIEWER_SCOPE;
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
