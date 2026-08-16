import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { getCase } from "@/lib/store";
import { canAct } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Schema = z.object({
  caseId: z.string().regex(/^CASE-[0-9]{1,6}$/),
  action: z.enum(["investigate", "escalate", "resolve", "export"]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  if (!rateLimit(`action:${ip}`, 30, 60_000).ok)
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { caseId, action } = parsed.data;
  if (!getCase(caseId)) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!canAct(session.role, action))
    return NextResponse.json({ error: `Role '${session.role}' cannot ${action}` }, { status: 403 });

  audit({ actor: session.user, role: session.role, action, target: caseId, ip });
  return NextResponse.json({ ok: true, action });
}
