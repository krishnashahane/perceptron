import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getCase } from "@/lib/store";
import { buildPrompt, offlineAnswer } from "@/lib/copilot";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  caseId: z.string().regex(/^CASE-[0-9]{1,6}$/),
  question: z.string().min(2).max(280),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  if (!rateLimit(`copilot:${ip}`, 20, 60_000).ok)
    return NextResponse.json({ error: "Rate limit — slow down." }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const found = getCase(parsed.data.caseId);
  if (!found) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const { c } = found;
  const q = parsed.data.question;
  audit({ actor: session.user, role: session.role, action: "copilot_query", target: c.id, ip });

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ answer: offlineAnswer(c, q), source: "offline" });
  }

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(c, q) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 220 },
        }),
        signal: AbortSignal.timeout(9000),
      }
    );
    if (!res.ok) throw new Error("gemini " + res.status);
    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!answer) throw new Error("empty");
    return NextResponse.json({ answer, source: "ai" });
  } catch {
    // Graceful degradation — still fully explainable.
    return NextResponse.json({ answer: offlineAnswer(c, q), source: "offline" });
  }
}
