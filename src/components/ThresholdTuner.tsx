"use client";
import { useMemo, useState } from "react";

type Pt = { s: number; a: 0 | 1 };

function metricsAt(labeled: Pt[], thr: number) {
  let tp = 0, fp = 0, fn = 0, flagged = 0;
  for (const { s, a } of labeled) {
    const pred = s >= thr;
    if (pred) flagged++;
    if (pred && a) tp++;
    else if (pred && !a) fp++;
    else if (!pred && a) fn++;
  }
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  return { precision, recall, f1, flagged };
}

export default function ThresholdTuner({ labeled }: { labeled: Pt[] }) {
  const [thr, setThr] = useState(35);
  const m = useMemo(() => metricsAt(labeled, thr), [labeled, thr]);

  // PR tradeoff curve across thresholds.
  const curve = useMemo(() => {
    const pts: { t: number; p: number; r: number }[] = [];
    for (let t = 0; t <= 100; t += 4) {
      const { precision, recall } = metricsAt(labeled, t);
      pts.push({ t, p: precision, r: recall });
    }
    return pts;
  }, [labeled]);

  const W = 260, H = 90;
  const path = (key: "p" | "r") =>
    curve.map((c, i) => `${i === 0 ? "M" : "L"} ${(c.t / 100) * W} ${H - c[key] * H}`).join(" ");

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="kicker">decision threshold · live tuning</span>
        <span className="text-[11px] tabular-nums text-[var(--accent)]">≥ {thr}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mb-2">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} y1={H - f * H} x2={W} y2={H - f * H} stroke="#141d2b" strokeWidth={0.6} />
        ))}
        <path d={path("p")} fill="none" stroke="var(--accent)" strokeWidth={1.4} />
        <path d={path("r")} fill="none" stroke="var(--high)" strokeWidth={1.4} />
        <line x1={(thr / 100) * W} y1={0} x2={(thr / 100) * W} y2={H} stroke="var(--accent-2)" strokeWidth={1} strokeDasharray="3 3" />
      </svg>

      <input
        type="range"
        min={0}
        max={100}
        value={thr}
        onChange={(e) => setThr(+e.target.value)}
        className="w-full accent-[var(--accent)]"
      />

      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
        <M label="precision" v={m.precision} c="var(--accent)" />
        <M label="recall" v={m.recall} c="var(--high)" />
        <M label="F1" v={m.f1} c="var(--accent-2)" />
        <div>
          <div className="text-[14px] font-semibold tabular-nums text-[var(--fg)]">{m.flagged}</div>
          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">flagged</div>
        </div>
      </div>
      <p className="text-[9px] text-[var(--faint)] mt-2">
        <span className="text-[var(--accent)]">precision</span> vs <span className="text-[var(--high)]">recall</span> —
        raise the bar to cut false positives, lower it to catch more. Operator-owned.
      </p>
    </div>
  );
}

function M({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div>
      <div className="text-[14px] font-semibold tabular-nums" style={{ color: c }}>{(v * 100).toFixed(0)}%</div>
      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{label}</div>
    </div>
  );
}
