import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  role: z.enum(["admin", "manager", "viewer"]).optional(),
  divisionAccess: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: 422, details: parsed.error.flatten() }, { status: 422 });
  }

  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!updated) return NextResponse.json({ error: "Not found", code: 404 }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  const { id } = await params;
  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
