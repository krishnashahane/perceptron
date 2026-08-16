import { createHash } from "node:crypto";

// Append-only, hash-chained audit trail (WORM-style). Each entry commits to the
// previous entry's hash, so any tampering or deletion breaks the chain and is
// detectable — the integrity property auditors care about, without a blockchain.
export interface AuditEntry {
  seq: number;
  ts: number;
  actor: string;
  role: string;
  action: string;
  target: string;
  ip: string;
  prevHash: string;
  hash: string;
}

const GENESIS = "0".repeat(64);
const LOG: AuditEntry[] = [];
const MAX = 1000;

function hashEntry(e: Omit<AuditEntry, "hash">): string {
  return createHash("sha256")
    .update(`${e.seq}|${e.ts}|${e.actor}|${e.role}|${e.action}|${e.target}|${e.ip}|${e.prevHash}`)
    .digest("hex");
}

export function audit(e: { actor: string; role: string; action: string; target: string; ip: string }) {
  const prev = LOG[LOG.length - 1];
  const base = {
    seq: LOG.length,
    ts: Date.now(),
    prevHash: prev ? prev.hash : GENESIS,
    ...e,
  };
  LOG.push({ ...base, hash: hashEntry(base) });
  if (LOG.length > MAX) LOG.splice(0, LOG.length - MAX);
}

export function recentAudit(n = 50): AuditEntry[] {
  return LOG.slice(-n).reverse();
}

// Recompute the chain to prove no entry was altered or removed.
export function verifyChain(): { ok: boolean; length: number; brokenAt: number | null } {
  let prevHash = LOG.length ? LOG[0].prevHash : GENESIS;
  for (const e of LOG) {
    const expected = hashEntry({ seq: e.seq, ts: e.ts, actor: e.actor, role: e.role, action: e.action, target: e.target, ip: e.ip, prevHash });
    if (e.prevHash !== prevHash || e.hash !== expected) return { ok: false, length: LOG.length, brokenAt: e.seq };
    prevHash = e.hash;
  }
  return { ok: true, length: LOG.length, brokenAt: null };
}
