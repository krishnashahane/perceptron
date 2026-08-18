import Link from "next/link";
import { getResult } from "@/lib/store";
import { getSession } from "@/lib/session";
import Stat from "@/components/Stat";
import LiveFeed, { type FeedItem } from "@/components/LiveFeed";
import RiskGraph from "@/components/RiskGraph";
import ThresholdTuner from "@/components/ThresholdTuner";
import DistrictMap from "@/components/DistrictMap";
import { inr, sevColor } from "@/lib/ui";
import type { Severity } from "@/lib/types";

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Command Center",
  description: "Live integrity surveillance: KPIs, real-time detections, highest-risk cases and predictive district risk.",
};
export const dynamic = "force-dynamic";

export default async function CommandPage() {
  const r = getResult();
  const session = await getSession();

  const feed: FeedItem[] = r.cases
    .slice(0, 48)
    .map((c) => ({ id: c.id, score: c.score, severity: c.severity, district: c.district, signals: c.detectedLabels }));

  const sevCounts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const c of r.cases) sevCounts[c.severity]++;
  const top = r.cases.slice(0, 12);

  const kpis = [
    { k: "disbursed (analyzed)", v: r.kpis.totalDisbursed, cur: true },
    { k: "beneficiaries", v: r.kpis.beneficiaries },
    { k: "flagged cases", v: r.kpis.flagged, accent: "var(--accent)" },
    { k: "at risk", v: r.kpis.amountAtRisk, cur: true, accent: "var(--high)" },
    { k: "critical", v: r.kpis.critical, accent: "var(--crit)" },
  ];

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="kicker">operational command center</div>
          <h1 className="text-lg font-semibold tracking-wide mt-1">
            Integrity Surveillance <span className="text-[var(--muted)]">/ Housing Scheme · June 2026</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 panel px-4 py-2 max-w-full">
          <Metric label="precision" v={r.eval.precision} />
          <Div />
          <Metric label="recall" v={r.eval.recall} />
          <Div />
          <Metric label="F1" v={r.eval.f1} accent />
          <Div />
          <div className="text-[10px] text-[var(--muted)] leading-tight hidden sm:block">
            validated on<br />labeled truth
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((c) => (
          <div key={c.k} className="panel panel-hover p-4 relative overflow-hidden rise">
            <div className="kicker">{c.k}</div>
            <div className="text-2xl font-semibold mt-2 tabular-nums" style={{ color: c.accent || "var(--fg)" }}>
              <Stat value={c.v} currency={c.cur} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--faint)] -mt-2">
        deterministic dataset · seed 42 · figures are reproducible across reloads (count-up is animation only, not live drift)
      </p>

      {/* main grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <DistrictMap districts={r.districts.map((d) => ({ district: d.district, risk: d.risk, cases: d.cases, amountAtRisk: d.amountAtRisk }))} />
          <LiveFeed items={feed} />

          {/* cases table */}
          <div className="panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
              <span className="kicker">highest-risk cases</span>
              <span className="text-[10px] text-[var(--muted)]">ranked by integrity score</span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[420px]">
              <thead>
                <tr className="text-[var(--faint)] text-[10px] uppercase tracking-wider">
                  <th className="text-left font-normal px-4 py-2">case</th>
                  <th className="text-left font-normal px-2 py-2">district</th>
                  <th className="text-left font-normal px-2 py-2 hidden sm:table-cell">signals</th>
                  <th className="text-right font-normal px-2 py-2">at risk</th>
                  <th className="text-right font-normal px-4 py-2">score</th>
                </tr>
              </thead>
              <tbody>
                {top.map((c) => (
                  <tr key={c.id} title={`Flagged by: ${c.detectedLabels.join(", ").replace(/_/g, " ")}`} className="border-t border-[var(--border)] hover:bg-[var(--bg-elev)] group">
                    <td className="px-4 py-2.5">
                      <Link href={`/cases/${c.id}`} prefetch={false} className="text-[var(--fg)] group-hover:text-[var(--accent)]">
                        {c.id}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-[var(--muted)]">{c.district}</td>
                    <td className="px-2 py-2.5 text-[var(--muted)] hidden sm:table-cell">{c.detectedLabels.length} indicators</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-[var(--muted)]">{inr(c.amountAtRisk)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-16 h-1.5 rounded-full bg-[var(--bg)] overflow-hidden hidden sm:inline-block">
                          <span className="block h-full" style={{ width: `${c.score}%`, background: sevColor[c.severity] }} />
                        </span>
                        <span className="tabular-nums font-semibold" style={{ color: sevColor[c.severity] }}>{c.score}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="space-y-5 min-w-0">
          {/* severity distribution */}
          <div className="panel p-4">
            <div className="kicker mb-3">severity distribution</div>
            <div className="space-y-2.5">
              {(["critical", "high", "medium", "low"] as Severity[]).map((s) => {
                const max = Math.max(1, ...Object.values(sevCounts));
                return (
                  <div key={s} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 text-[var(--muted)] capitalize">{s}</span>
                    <span className="flex-1 h-2 rounded-full bg-[var(--bg)] overflow-hidden">
                      <span className="block h-full rise" style={{ width: `${(sevCounts[s] / max) * 100}%`, background: sevColor[s] }} />
                    </span>
                    <span className="w-6 text-right tabular-nums" style={{ color: sevColor[s] }}>{sevCounts[s]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ThresholdTuner labeled={r.labeled} />

          {/* district predictive risk */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="kicker">predictive district risk</span>
              <span className="text-[9px] text-[var(--muted)]">next-cycle priority</span>
            </div>
            <div className="space-y-2">
              {r.districts.slice(0, 6).map((d) => (
                <div key={d.district} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 text-[var(--fg)]">{d.district}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
                    <span className="block h-full" style={{ width: `${d.risk}%`, background: d.risk >= 18 ? "var(--crit)" : "var(--med)" }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-[var(--muted)]">{d.risk}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* mini graph */}
          <Link href="/graph" prefetch={false} className="panel panel-hover p-3 block group">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="kicker">collusion network</span>
              <span className="text-[10px] text-[var(--muted)] group-hover:text-[var(--accent)]">expand ▸</span>
            </div>
            <div className="pointer-events-none opacity-90">
              <RiskGraph graph={r.graph} interactive={false} />
            </div>
          </Link>
        </div>
      </div>

      <p className="text-[10px] text-[var(--faint)]">
        signed in as {session?.user} · {session?.role} · every action is written to the audit trail · AI never auto-acts
      </p>
    </div>
  );
}

function Metric({ label, v, accent }: { label: string; v: number; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[15px] font-semibold tabular-nums" style={{ color: accent ? "var(--accent)" : "var(--fg)" }}>
        {(v * 100).toFixed(1)}%
      </div>
      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{label}</div>
    </div>
  );
}
function Div() {
  return <span className="w-px h-7 bg-[var(--border)]" />;
}
