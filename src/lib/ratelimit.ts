// Fixed-window in-memory limiter (per key). Best-effort per server instance.
const hits = new Map<string, { c: number; reset: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { c: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  e.c++;
  return { ok: e.c <= limit, remaining: Math.max(0, limit - e.c) };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
