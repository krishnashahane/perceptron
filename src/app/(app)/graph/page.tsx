import { getResult } from "@/lib/store";
import NetworkExplorer from "@/components/NetworkExplorer";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Collusion Network",
  description: "Beneficiaries, bank accounts and contractors as one graph — multi-hop rings surfaced via community detection.",
};
export const dynamic = "force-dynamic";

export default function GraphPage() {
  const r = getResult();
  const totalExposure = r.communities.reduce((s, c) => s + c.exposure, 0);

  return (
    <div className="space-y-5">
      <div>
        <div className="kicker">relationship intelligence</div>
        <h1 className="text-lg font-semibold tracking-wide mt-1">Collusion Network</h1>
        <p className="text-[12px] text-[var(--muted)] mt-1 max-w-2xl">
          Each cluster is a suspected ring — beneficiaries pulled together because they share a bank account, phone or
          document. Click a ring to isolate it and read, in one line, why it was flagged.
        </p>
      </div>

      <NetworkExplorer
        graph={r.graph}
        communities={r.communities}
        totalExposure={totalExposure}
        totalCases={r.kpis.flagged}
      />
    </div>
  );
}
