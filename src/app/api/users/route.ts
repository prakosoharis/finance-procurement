import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      divisionAccess: users.divisionAccess,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users);

  return NextResponse.json(rows);
}

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["admin", "manager", "viewer"]),
  divisionAccess: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("admin");
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: 422, details: parsed.error.flatten() }, { status: 422 });
  }

  const tempPassword = randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email.toLowerCase().trim(),
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      divisionAccess: parsed.data.divisionAccess ?? [],
      passwordHash,
      invitedBy: session.user.id,
    })
    .returning({ id: users.id, email: users.email });

  // NOTE: no transactional email service is wired up yet (tech spec §6.6 proposes Resend).
  // The temp password is returned once here so the admin can relay it out-of-band.
  return NextResponse.json({ ...created, tempPassword }, { status: 201 });
}
