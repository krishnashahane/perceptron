"use client";
import { useMemo, useState } from "react";
import type { Hub } from "@/lib/types";
import type { SimCase } from "@/lib/store";
import { inr } from "@/lib/ui";

export default function Simulator({ hubs, cases, totalExposure }: { hubs: Hub[]; cases: SimCase[]; totalExposure: number }) {
  const [disrupted, setDisrupted] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setDisrupted((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const { neutralized, prevented, residualCases, residualExposure } = useMemo(() => {
    const neu = new Set<string>();
    for (const c of cases) if (disrupted.has(c.bank) || disrupted.has(c.contractor)) neu.add(c.id);
    let prevented = 0;
    for (const c of cases) if (neu.has(c.id)) prevented += c.amt;
    return {
      neutralized: neu,
      prevented,
      residualCases: cases.length - neu.size,
      residualExposure: totalExposure - prevented,
    };
  }, [disrupted, cases, totalExposure]);

  const pct = totalExposure ? Math.round((prevented / totalExposure) * 100) : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {/* control */}
      <div className="lg:col-span-2 panel p-4 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <span className="kicker">disruption targets · toggle to neutralize a hub</span>
          <span className="text-[10px] text-[var(--muted)]">{disrupted.size} disrupted</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {hubs.map((h) => {
            const on = disrupted.has(h.id);
            return (
              <button
                key={h.id}
                onClick={() => toggle(h.id)}
                className="text-left panel panel-hover p-3 transition"
                style={{ borderColor: on ? "var(--crit)" : "var(--border)", background: on ? "rgba(255,77,94,0.06)" : undefined }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--fg)]">{h.id}</span>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: "var(--bg-elev)", color: h.kind === "bank" ? "var(--crit)" : "var(--high)" }}>
                    {h.kind}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-[var(--muted)]">{h.linked} linked cases</span>
                  <span className="text-[11px] tabular-nums" style={{ color: on ? "var(--crit)" : "var(--muted)" }}>
                    {on ? "◉ NEUTRALIZED" : inr(h.exposure)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* impact */}
      <div className="space-y-4">
        <div className="panel p-4 hud">
          <div className="kicker mb-2">prevented exposure</div>
          <div className="text-3xl font-semibold tabular-nums text-[var(--accent-2)] flick" key={prevented}>{inr(prevented)}</div>
          <div className="mt-2 h-2 rounded-full bg-[var(--bg)] overflow-hidden">
            <span className="block h-full transition-all" style={{ width: `${pct}%`, background: "var(--accent-2)" }} />
          </div>
          <div className="text-[10px] text-[var(--muted)] mt-1">{pct}% of total exposure averted</div>
        </div>
        <div className="panel p-4 grid grid-cols-2 gap-3">
          <Metric label="cases neutralized" v={`${neutralized.size}`} c="var(--accent-2)" />
          <Metric label="cases remaining" v={`${residualCases}`} c="var(--fg)" />
          <Metric label="residual exposure" v={inr(residualExposure)} c="var(--high)" />
          <Metric label="hubs disrupted" v={`${disrupted.size}`} c="var(--muted)" />
        </div>
        <p className="text-[10px] text-[var(--faint)] leading-relaxed panel p-3">
          Preventive governance: freezing a shared bank account or debarring a contractor collapses the whole ring.
          The simulator quantifies loss <span className="text-[var(--fg)]">averted before disbursement closes</span> —
          a decision aid, not an automated action.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, v, c }: { label: string; v: string; c: string }) {
  return (
    <div>
      <div className="text-[15px] font-semibold tabular-nums" style={{ color: c }}>{v}</div>
      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
