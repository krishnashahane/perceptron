import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getResult } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-authoritative live detection stream. The client polls this; every
// viewer sees the same ordered stream of REAL detected cases with server
// timestamps — a genuine ingestion feed, not a client-side illusion.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`live:${clientIp(req)}`, 120, 60_000).ok)
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { cases } = getResult();
  const url = new URL(req.url);
  const cursor = Math.max(0, parseInt(url.searchParams.get("cursor") || "0", 10) || 0);
  const batch = 1;
  const events = [];
  for (let i = 0; i < batch; i++) {
    const c = cases[(cursor + i) % cases.length];
    events.push({
      id: c.id,
      score: c.score,
      model: c.modelScore,
      severity: c.severity,
      district: c.district,
      signals: c.detectedLabels,
      t: new Date().toISOString().slice(11, 19),
    });
  }
  return NextResponse.json({ events, cursor: cursor + batch, total: cases.length }, {
    headers: { "cache-control": "no-store" },
  });
}
