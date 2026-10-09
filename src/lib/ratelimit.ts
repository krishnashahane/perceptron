// Fixed-window in-memory limiter (per server instance).
// For a multi-instance deployment, use a shared store instead.
const hits = new Map<string, { c: number; reset: number }>();
const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();

  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) {
      if (v.reset <= now) hits.delete(k);
    }
  }

  const e = hits.get(key);
  if (!e || e.reset <= now) {
    hits.set(key, { c: 1, reset: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1) };
  }

  e.c += 1;
  return { ok: e.c <= limit, remaining: Math.max(0, limit - e.c) };
}

export function clientIp(req: Request): string {
  const h = req.headers;

  // Prefer provider-controlled single-IP headers when available.
  const trusted =
    h.get("x-vercel-forwarded-for") ||
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip");

  if (trusted?.trim()) return trusted.trim();

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
