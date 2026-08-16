"use client";
import { useEffect, useState } from "react";
import { riskColor } from "@/lib/ui";

export default function Gauge({ score }: { score: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1000);
      setV(score * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const R = 70;
  const C = Math.PI * R; // semicircle length
  const frac = v / 100;
  const color = riskColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 110" className="w-52">
        <path d="M 20 100 A 70 70 0 0 1 160 100" fill="none" stroke="#121a28" strokeWidth={12} strokeLinecap="round" />
        <path
          d="M 20 100 A 70 70 0 0 1 160 100"
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="90" y="88" textAnchor="middle" fontSize="34" fontWeight="700" fill={color} className="mono tabular-nums">
          {Math.round(v)}
        </text>
        <text x="90" y="103" textAnchor="middle" fontSize="9" fill="var(--muted)" className="mono">INTEGRITY RISK</text>
      </svg>
    </div>
  );
}
