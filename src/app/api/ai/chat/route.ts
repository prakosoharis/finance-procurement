import { NextRequest, NextResponse } from "next/server";
import { requireSession, allowedDivisionsFor } from "@/lib/rbac";
import { getPnlRows } from "@/lib/queries/pnl";
import { db } from "@/lib/db";
import { aiChatHistory } from "@/lib/db/schema";
import { buildSystemPrompt, buildOfflineAnalysis } from "@/lib/ai-context";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
  filter_context: z.object({
    division: z.string().optional(),
    year: z.string().optional(),
    // The client has always sent `quarter`; without it declared here Zod stripped it and
    // the assistant answered on year-level data even when a quarter was selected.
    quarter: z.string().optional(),
    currency: z.string().optional(),
  }),
  session_id: z.string().uuid().optional(),
});

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
    quarter: filter_context.quarter,
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
    reply = buildOfflineAnalysis(rows, filter_context);
  } else {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        system: buildSystemPrompt(rows, filter_context),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const textBlock = response.content.find((b) => b.type === "text");
      reply = textBlock && textBlock.type === "text" ? textBlock.text : buildOfflineAnalysis(rows, filter_context);
    } catch (err) {
      // Never leave the user with a dead chat on a transient API failure — fall back to
      // the deterministic analysis and say what happened.
      console.error("Anthropic request failed:", err);
      reply = `${buildOfflineAnalysis(rows, filter_context)}\n\n(The live AI service could not be reached for this question, so the summary above was computed locally.)`;
    }
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
