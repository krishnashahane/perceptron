import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, checkCredential, newSession, signSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const LoginSchema = z.object({
  user: z.string().min(2).max(32),
  pass: z.string().min(4).max(128),
});

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 });

  const { user, pass } = parsed.data;
  const role = checkCredential(user, pass);
  if (!role) {
    audit({ actor: user, role: "-", action: "login_failed", target: "-", ip });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession(newSession(user.toLowerCase(), role));
  audit({ actor: user.toLowerCase(), role, action: "login", target: "-", ip });
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, cookieOpts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  return res;
}
