"use client";
import { useEffect, useState } from "react";

// Live operational telemetry strip — server-agnostic HUD chrome that makes the
// console feel like an active surveillance grid.
export default function StatusStrip({ sectors, nodes }: { sectors: number; nodes: number }) {
  const [tick, setTick] = useState(0);
  const [pkts, setPkts] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setTick((t) => (t + 1) % sectors);
      setPkts((p) => p + Math.floor(3 + Math.random() * 40));
    }, 1400);
    return () => clearInterval(iv);
  }, [sectors]);

  const items = [
    ["UPLINK", "SECURE", "var(--accent-2)"],
    ["SCAN", `SECTOR ${String(tick + 1).padStart(2, "0")}/${sectors}`, "var(--accent)"],
    ["NODES", `${nodes} TRACKED`, "var(--fg)"],
    ["PACKETS", pkts.toLocaleString(), "var(--muted)"],
    ["THREAT", "ELEVATED", "var(--high)"],
    ["MODE", "AUTONOMOUS·HITL", "var(--muted)"],
  ] as const;

  const feed = [
    "correlating multimodal signals",
    "graph community pass complete",
    "anomaly model: nominal",
    "no operator override pending",
    "ledger integrity: chain verified",
    "predictive sweep queued",
  ];

  return (
    <div className="border-b border-[var(--border)] bg-[color:var(--bg-elev)]/60">
      <div className="mx-auto max-w-[1400px] px-4 h-8 flex items-center gap-4 text-[10px] overflow-hidden">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--crit)] rec-dot" />
          <span className="text-[var(--crit)] tracking-widest">REC</span>
        </span>
        <div className="flex items-center gap-4 shrink-0">
          {items.map(([k, v, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="text-[var(--faint)]">{k}</span>
              <span className="flick" style={{ color: c as string }}>{v}</span>
            </span>
          ))}
        </div>
        <div className="ml-auto min-w-0 flex-1 overflow-hidden hidden md:block">
          <div className="ticker-track text-[var(--muted)]">
            {[...feed, ...feed].map((f, i) => (
              <span key={i} className="mx-4">▸ {f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
