import type { Role } from "@/lib/types";

// Stateless, tamper-evident sessions: HMAC-SHA256 signed cookie, verified with
// Web Crypto so the same code runs in Node route handlers AND the edge proxy.

export const SESSION_COOKIE = "perceptron_session";
const TTL_MS = 1000 * 60 * 60 * 8; // 8h

export interface Session {
  user: string;
  role: Role;
  iat: number;
  exp: number;
}

function secret(): string {
  return process.env.PERCEPTRON_SECRET || "dev-only-insecure-secret-change-me";
}

const enc = new TextEncoder();
function bytes(s: string): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(s.length * 3));
  const { written } = enc.encodeInto(s, b);
  return b.subarray(0, written) as Uint8Array<ArrayBuffer>;
}
function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bytes(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(s: Session): Promise<string> {
  const payload = b64url(bytes(JSON.stringify(s)));
  const sig = await crypto.subtle.sign("HMAC", await key(), bytes(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), b64urlToBytes(sig), bytes(payload));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as Session;
    if (!s.exp || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function newSession(user: string, role: Role): Session {
  const now = Date.now();
  return { user, role, iat: now, exp: now + TTL_MS };
}

// Demo credential store. In production these map to an IdP / hashed store.
interface Cred { pass: string; role: Role }
const CREDS: Record<string, Cred> = {
  analyst: { pass: process.env.PERCEPTRON_PW_ANALYST || "perceptron-analyst", role: "analyst" },
  investigator: { pass: process.env.PERCEPTRON_PW_INVESTIGATOR || "perceptron-invest", role: "investigator" },
  admin: { pass: process.env.PERCEPTRON_PW_ADMIN || "perceptron-admin", role: "admin" },
};

// Constant-time-ish compare to avoid trivial timing leaks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function checkCredential(user: string, pass: string): Role | null {
  const c = CREDS[user?.toLowerCase?.() ?? ""];
  if (!c) return null;
  return safeEqual(pass ?? "", c.pass) ? c.role : null;
}

export { canAct } from "@/lib/rbac";
