import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getResult } from "@/lib/store";
import TopBar from "@/components/TopBar";
import StatusStrip from "@/components/StatusStrip";
import TelemetryBar from "@/components/TelemetryBar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) redirect("/");
  const r = getResult();
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Classification banner — national-operations chrome */}
      <div className="h-6 flex items-center justify-center text-[9px] tracking-[0.32em] uppercase mono border-b border-[var(--border)] bg-[color:var(--panel-high)] text-[var(--faint)] select-none">
        <span className="text-[var(--crit)]">▲</span>
        <span className="mx-2">Restricted // Official Use Only // Integrity Intelligence Grid</span>
        <span className="text-[var(--crit)] hidden sm:inline">▲</span>
      </div>
      <TopBar user={session.user} role={session.role} />
      <StatusStrip flagged={r.kpis.flagged} rings={r.communities.length} precision={r.eval.precision} />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 flex-1">{children}</div>
      <TelemetryBar
        flagged={r.kpis.flagged}
        rings={r.communities.length}
        exposure={r.kpis.amountAtRisk}
        critical={r.kpis.critical}
      />
    </div>
  );
}
