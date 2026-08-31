import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { aiChatHistory } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Validation failed: session_id required", code: 422 }, { status: 422 });

  const rows = await db
    .select()
    .from(aiChatHistory)
    .where(and(eq(aiChatHistory.userId, session.user.id), eq(aiChatHistory.sessionId, sessionId)))
    .orderBy(aiChatHistory.createdAt);

  return NextResponse.json(rows);
}
