import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { getSession } from "@/lib/session";
import Gauge from "@/components/Gauge";
import Radar from "@/components/Radar";
import Copilot from "@/components/Copilot";
import CaseActions from "@/components/CaseActions";
import { inr, sevColor, dimLabel } from "@/lib/ui";

import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · Case File`, description: `Explainable integrity-risk breakdown and evidence ledger for ${id}.` };
}

function mask(s: string) {
  return s.length <= 3 ? s : "•".repeat(s.length - 3) + s.slice(-3);
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getCase(id);
  if (!found) notFound();
  const { c, ben } = found;
  const session = (await getSession())!;

  const entities: [string, string][] = [
    ["beneficiary", ben.id],
    ["bank account", ben.bankAccountId],
    ["contractor", ben.contractorId],
    ["phone", mask(ben.phone)],
    ["geo cluster", ben.addressCluster],
    ["district", ben.district],
  ];
  const linked = new Set<string>();
  c.evidence.forEach((e) => e.refs.filter((r) => r.startsWith("B-")).forEach((r) => linked.add(r)));

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/command" className="text-[11px] text-[var(--muted)] hover:text-[var(--accent)]">← command</Link>
        <span className="text-[var(--faint)]">/</span>
        <h1 className="text-lg font-semibold tracking-wide">{c.id}</h1>
        <span className="text-[11px] px-2 py-0.5 rounded-full border uppercase tracking-wider"
          style={{ color: sevColor[c.severity], borderColor: sevColor[c.severity] }}>
          {c.severity}
        </span>
        <span className="text-[11px] text-[var(--muted)]">{ben.district}</span>
        <span className="ml-auto text-[12px]">
          <span className="text-[var(--muted)]">exposure </span>
          <span className="text-[var(--high)] font-semibold">{inr(c.amountAtRisk)}</span>
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* score + entities + actions */}
        <div className="panel p-5 space-y-5">
          <Gauge score={c.score} />
          <div className="grid grid-cols-2 gap-2 -mt-2">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-center">
              <div className="text-[9px] text-[var(--faint)] uppercase tracking-wider">rule engine</div>
              <div className="text-[15px] font-semibold tabular-nums text-[var(--accent)]">{c.score}</div>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-center">
              <div className="text-[9px] text-[var(--faint)] uppercase tracking-wider">ML anomaly</div>
              <div className="text-[15px] font-semibold tabular-nums text-[var(--high)]">{c.modelScore}</div>
            </div>
          </div>
          <div className="hairline pt-4">
            <div className="kicker mb-2">linked entities</div>
            <div className="grid grid-cols-2 gap-2">
              {entities.map(([k, v]) => (
                <div key={k} className="bg-[var(--bg)] border border-[var(--border)] rounded-md px-2.5 py-1.5">
                  <div className="text-[9px] text-[var(--faint)] uppercase tracking-wider">{k}</div>
                  <div className="text-[12px] text-[var(--fg)] truncate">{v}</div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-[var(--faint)] mt-2">identity minimized · DPDP-aligned display</p>
          </div>
          <div className="hairline pt-4">
            <div className="kicker mb-2">disposition</div>
            <CaseActions caseId={c.id} role={session.role} />
          </div>
        </div>

        {/* evidence */}
        <div className="lg:col-span-2 panel p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="kicker">why flagged · evidence ledger</span>
            <span className="text-[10px] text-[var(--muted)]">{c.evidence.length} indicators · {c.score}/100</span>
          </div>
          <div className="space-y-2.5">
            {c.evidence.map((e, i) => (
              <div key={i} className="flex items-start gap-3 bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2.5 rise">
                <span className="mt-0.5 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-elev)", color: "var(--accent)" }}>
                  {dimLabel[e.dim]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-[var(--fg)]">{e.detail}</div>
                  {e.refs.some((r) => r.startsWith("B-")) && (
                    <div className="text-[10px] text-[var(--muted)] mt-0.5">
                      linked: {e.refs.filter((r) => r.startsWith("B-")).slice(0, 6).map((r) => (
                        <Link key={r} href={`/cases/CASE-${r.slice(2)}`} prefetch={false} className="hover:text-[var(--accent)]">{r} </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] tabular-nums text-[var(--high)]">+{e.weight}</div>
                  <div className="text-[9px] text-[var(--faint)]">weight</div>
                </div>
              </div>
            ))}
          </div>
          <div className="hairline mt-4 pt-3 text-[11px] text-[var(--muted)] leading-relaxed">
            Each indicator is individually weak. PERCEPTRON scores the <span className="text-[var(--fg)]">combination</span> —
            {linked.size} related beneficiaries share attributes with this record. Findings are investigative
            leads requiring human verification, not determinations of guilt.
          </div>
        </div>
      </div>

      {/* radar + copilot */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="panel p-5">
          <div className="kicker mb-2">risk dimensions</div>
          <Radar dims={c.dims} />
        </div>
        <div className="lg:col-span-2 min-w-0">
          <Copilot caseId={c.id} />
        </div>
      </div>
    </div>
  );
}
