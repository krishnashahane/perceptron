import { getResult } from "@/lib/store";
import RiskGraph from "@/components/RiskGraph";
import { inr } from "@/lib/ui";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Collusion Network",
  description: "Beneficiaries, bank accounts and contractors as one graph — multi-hop rings surfaced via community detection.",
};
export const dynamic = "force-dynamic";

export default function GraphPage() {
  const r = getResult();
  const ranked = r.communities.slice(0, 8);

  return (
    <div className="space-y-5">
      <div>
        <div className="kicker">relationship intelligence</div>
        <h1 className="text-lg font-semibold tracking-wide mt-1">Collusion Network Graph</h1>
        <p className="text-[12px] text-[var(--muted)] mt-1 max-w-2xl">
          Beneficiaries, bank accounts and contractors as a single graph. Shared hubs reveal rings that look
          clean row-by-row. Hover to trace a relationship; click a beneficiary to open its case.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 panel p-3 scan min-w-0">
          <RiskGraph graph={r.graph} />
        </div>

        <div className="panel p-4">
          <div className="kicker mb-3">suspected rings · by exposure</div>
          <div className="space-y-2.5">
            {ranked.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 rise">
                <span className="text-[11px] text-[var(--faint)] w-5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-[var(--fg)] truncate">{c.id}</div>
                  <div className="text-[10px] text-[var(--muted)]">
                    {c.members} beneficiaries · {c.districts.join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] tabular-nums text-[var(--high)]">{inr(c.exposure)}</div>
                  <div className="text-[9px] text-[var(--faint)]">exposure</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hairline mt-4 pt-3 text-[10px] text-[var(--muted)] leading-relaxed">
            Detection method: shared-attribute edges (bank / phone / document) → <span className="text-[var(--fg)]">union-find
            community detection</span> (multi-hop rings) → severity-weighted exposure. No single record is condemned in isolation.
          </div>
        </div>
      </div>
    </div>
  );
}
