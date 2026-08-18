"use client";
import { useState } from "react";
import RiskGraph from "@/components/RiskGraph";
import type { Community, RiskGraph as RG } from "@/lib/types";
import { inr } from "@/lib/ui";

export default function NetworkExplorer({
  graph,
  communities,
  totalExposure,
  totalCases,
}: {
  graph: RG;
  communities: Community[];
  totalExposure: number;
  totalCases: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const top = communities.slice(0, 5);
  const list = showAll ? communities.slice(0, 12) : top;
  const active = communities.find((c) => c.id === (hover ?? selected)) ?? null;
  const worst = communities[0];

  return (
    <div className="space-y-4">
      {/* real, plain metrics — no fake telemetry */}
      <div className="grid grid-cols-3 gap-3">
        <Metric label="rings flagged" value={String(communities.length)} />
        <Metric label="exposure in rings" value={inr(totalExposure)} accent />
        <Metric label="flagged cases" value={String(totalCases)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* graph */}
        <div className="lg:col-span-2 panel p-0 overflow-hidden min-w-0">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="kicker">collusion network</div>
              <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                {active ? active.summary : `Showing the ${top.length} highest-exposure rings. Click one to isolate it.`}
              </div>
            </div>
            <button
              onClick={() => setShowAll((v) => !v)}
              className="shrink-0 text-[10px] tracking-wider px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--border-bright)] transition mono"
            >
              {showAll ? "TOP 5" : "SHOW ALL"}
            </button>
          </div>
          <div className="p-2">
            <RiskGraph
              graph={graph}
              communities={communities}
              showAll={showAll}
              selectedRing={selected}
              hoverRing={hover}
              onSelectRing={setSelected}
            />
          </div>
        </div>

        {/* ring list */}
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="kicker">rings · by exposure</span>
            {selected && (
              <button onClick={() => setSelected(null)} className="text-[9px] text-[var(--muted)] hover:text-[var(--fg)] mono">CLEAR ✕</button>
            )}
          </div>

          {worst && (
            <div className="mb-3 p-2.5 rounded border border-[var(--crit)]/40 bg-[color:var(--crit)]/8">
              <div className="text-[9px] uppercase tracking-widest text-[var(--crit)] mb-1">worst ring</div>
              <div className="text-[11px] text-[var(--fg)] leading-snug">{worst.summary}</div>
              <div className="text-[10px] text-[var(--muted)] mt-1">{inr(worst.exposure)} at risk</div>
            </div>
          )}

          <div className="space-y-1">
            {list.map((c, i) => {
              const on = c.id === selected;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(on ? null : c.id)}
                  onMouseEnter={() => setHover(c.id)}
                  onMouseLeave={() => setHover(null)}
                  className={`w-full text-left flex items-center gap-3 px-2 py-1.5 rounded transition ${
                    on ? "bg-[var(--accent)]/15 border border-[var(--accent)]/40" : "border border-transparent hover:bg-[var(--bg-elev)]"
                  }`}
                >
                  <span className="text-[11px] text-[var(--faint)] w-5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] text-[var(--fg)] truncate">{c.members} beneficiaries · {c.districts.length} districts</span>
                    <span className="block text-[10px] text-[var(--muted)] truncate">
                      {[c.sharedBanks && `${c.sharedBanks} bank`, c.sharedPhones && `${c.sharedPhones} phone`, c.sharedDocs && `${c.sharedDocs} doc`].filter(Boolean).join(" · ") || "linked records"}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[12px] tabular-nums text-[var(--high)]">{inr(c.exposure)}</span>
                    <span className="block text-[9px] text-[var(--faint)]">exposure</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hairline mt-4 pt-3 text-[10px] text-[var(--muted)] leading-relaxed">
            Rings are found by linking beneficiaries who share a bank account, phone or document, then merging those links
            (union-find). A single record is never condemned alone — only the pattern is.
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel p-3">
      <div className="kicker">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1" style={{ color: accent ? "var(--high)" : "var(--fg)" }}>{value}</div>
    </div>
  );
}
