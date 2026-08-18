import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { recentAudit, verifyChain } from "@/lib/audit";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Audit Trail",
  description: "Hash-chained, append-only WORM ledger of every operator action — tamper-evident and reviewable.",
};
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/command");
  const log = recentAudit(100);
  const chain = verifyChain();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="kicker">accountability · WORM ledger</div>
          <h1 className="text-lg font-semibold tracking-wide mt-1">Audit Trail</h1>
          <p className="text-[12px] text-[var(--muted)] mt-1">
            Hash-chained, append-only record of every operator action. Any edit or deletion breaks the chain.
          </p>
        </div>
        <div className="panel px-4 py-2.5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full dot-live" style={{ background: chain.ok ? "var(--accent-2)" : "var(--crit)" }} />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: chain.ok ? "var(--accent-2)" : "var(--crit)" }}>
              {chain.ok ? "CHAIN VERIFIED" : `TAMPER @ #${chain.brokenAt}`}
            </div>
            <div className="text-[10px] text-[var(--muted)]">{chain.length} sealed entries · SHA-256</div>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead>
            <tr className="text-[var(--faint)] text-[10px] uppercase tracking-wider">
              <th className="text-left font-normal px-4 py-2.5">time (utc)</th>
              <th className="text-left font-normal px-2 py-2.5">actor</th>
              <th className="text-left font-normal px-2 py-2.5">role</th>
              <th className="text-left font-normal px-2 py-2.5">action</th>
              <th className="text-left font-normal px-2 py-2.5">target</th>
              <th className="text-left font-normal px-2 py-2.5">ip</th>
              <th className="text-left font-normal px-4 py-2.5">hash</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12">
                  <div className="hud-frame max-w-sm mx-auto text-center panel p-6">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" />
                      <span className="kicker">ledger armed · awaiting first event</span>
                    </div>
                    <p className="text-[12px] text-[var(--muted)] mt-3">
                      No operator actions sealed yet. The moment anyone authenticates, investigates or escalates,
                      a hash-chained entry appears here — tamper-evident from entry #0.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {log.map((e, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="px-4 py-2 text-[var(--muted)] tabular-nums">{new Date(e.ts).toISOString().slice(0, 19).replace("T", " ")}</td>
                <td className="px-2 py-2 text-[var(--fg)]">{e.actor}</td>
                <td className="px-2 py-2 text-[var(--muted)] uppercase">{e.role}</td>
                <td className="px-2 py-2">
                  <span className={e.action.includes("fail") ? "text-[var(--crit)]" : e.action === "escalate" ? "text-[var(--high)]" : "text-[var(--accent)]"}>
                    {e.action}
                  </span>
                </td>
                <td className="px-2 py-2 text-[var(--muted)]">{e.target}</td>
                <td className="px-2 py-2 text-[var(--faint)] tabular-nums">{e.ip}</td>
                <td className="px-4 py-2 text-[var(--faint)] tabular-nums" title={e.hash}>{e.hash.slice(0, 10)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
