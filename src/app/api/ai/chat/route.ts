import { NextRequest, NextResponse } from "next/server";
import { requireSession, allowedDivisionsFor } from "@/lib/rbac";
import { getPnlRows } from "@/lib/queries/pnl";
import { db } from "@/lib/db";
import { aiChatHistory } from "@/lib/db/schema";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
  filter_context: z.object({
    division: z.string().optional(),
    year: z.string().optional(),
    currency: z.string().optional(),
  }),
  session_id: z.string().uuid().optional(),
});

function buildContextSummary(rows: Awaited<ReturnType<typeof getPnlRows>>) {
  if (rows.length === 0) return "No P&L data is loaded for this scope yet.";
  return rows
    .map(
      (r) =>
        `${r.division} ${r.periodLabel} [${r.recordType}]: NVC=$${r.netValueCreation.toFixed(2)}Mn, ROI=${r.roiPct.toFixed(1)}%, ValueCreation=$${r.totalValueCreation.toFixed(2)}Mn, CostIncurred=$${r.totalCostIncurred.toFixed(2)}Mn`
    )
    .join("\n");
}

/** Deterministic fallback used when ANTHROPIC_API_KEY isn't configured — no API cost, per tech spec §6.2. */
function offlineSummary(rows: Awaited<ReturnType<typeof getPnlRows>>) {
  if (rows.length === 0) return "No data is loaded for the current filter scope yet — try uploading a P&L file first.";
  const actual = rows.filter((r) => r.recordType === "actual");
  const totalNvc = actual.reduce((a, r) => a + r.netValueCreation, 0);
  const avgRoi = actual.length ? actual.reduce((a, r) => a + r.roiPct, 0) / actual.length : 0;
  return `Offline summary (AI assistant not configured): across ${actual.length} actual record(s) in the current scope, total Net Value Creation is $${totalNvc.toFixed(2)}Mn with an average ROI of ${avgRoi.toFixed(1)}%.`;
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: 422, details: parsed.error.flatten() }, { status: 422 });
  }

  const { messages, filter_context } = parsed.data;
  const sessionId = parsed.data.session_id ?? crypto.randomUUID();

  const allowed = allowedDivisionsFor(session.user);
  const rows = await getPnlRows({
    divisions: allowed,
    divisionParam: filter_context.division,
    year: filter_context.year,
  });

  const lastUserMessage = messages[messages.length - 1];
  await db.insert(aiChatHistory).values({
    userId: session.user.id,
    sessionId,
    role: "user",
    content: lastUserMessage.content,
    filterContext: filter_context,
  });

  let reply: string;
  if (!process.env.ANTHROPIC_API_KEY) {
    reply = offlineSummary(rows);
  } else {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = `You are the AI Assistant embedded in the Procurement P&L Intelligence Dashboard for Berau Coal Energy. Answer questions about procurement value creation, ROI, and cost structure using ONLY the data below. Be concise (a few sentences), quote figures in USD Millions unless the user asks for IDR, and say clearly when data is missing instead of guessing.\n\nCurrent scope: division=${filter_context.division ?? "All"}, year=${filter_context.year ?? "All"}\n\nData:\n${buildContextSummary(rows)}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    reply = textBlock && textBlock.type === "text" ? textBlock.text : "Sorry, I couldn't generate a response.";
  }

  await db.insert(aiChatHistory).values({
    userId: session.user.id,
    sessionId,
    role: "assistant",
    content: reply,
    filterContext: filter_context,
  });

  return NextResponse.json({ reply, session_id: sessionId });
}
