import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { detect } from "@/lib/engine";
import { parseCsvToDataset } from "@/lib/ingest";
import { audit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 20;

const Schema = z.object({ csv: z.string().min(10).max(4_000_000) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  const ip = clientIp(req);
  if (!rateLimit(`ingest:${ip}`, 6, 60_000).ok)
    return NextResponse.json({ error: "Rate limit — wait a minute." }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "CSV missing or too large (max 4MB)" }, { status: 400 });

  const ing = parseCsvToDataset(parsed.data.csv);
  if (!ing.data) return NextResponse.json({ error: "Parse failed", errors: ing.errors }, { status: 422 });

  const { result } = detect(ing.data);
  audit({ actor: session.user, role: session.role, action: "ingest", target: `${ing.rows} rows`, ip });

  return NextResponse.json({
    rows: ing.rows,
    errors: ing.errors.slice(0, 12),
    kpis: result.kpis,
    top: result.cases.slice(0, 15).map((c) => ({
      id: c.id, score: c.score, model: c.modelScore, severity: c.severity,
      district: c.district, amountAtRisk: c.amountAtRisk, labels: c.detectedLabels,
    })),
    communities: result.communities.slice(0, 6).map((c) => ({ id: c.id, members: c.members, exposure: c.exposure })),
  });
}
