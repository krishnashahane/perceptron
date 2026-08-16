"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { RiskGraph as RG } from "@/lib/types";
import { riskColor } from "@/lib/ui";

const KIND_STYLE = {
  beneficiary: { r: 5, fill: "var(--accent)", label: "Beneficiary" },
  bank: { r: 8, fill: "#ff4d5e", label: "Bank a/c" },
  contractor: { r: 7, fill: "#ff9f43", label: "Contractor" },
  official: { r: 7, fill: "#a78bfa", label: "Official" },
} as const;

export default function RiskGraph({ graph, interactive = true }: { graph: RG; interactive?: boolean }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target);
      (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source);
    }
    return m;
  }, [graph.edges]);

  const active = (id: string) => hover === id || (hover != null && adj.get(hover)?.has(id));

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 800 600" className="w-full h-auto select-none" role="img" aria-label="Risk relationship network">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.25)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(34,211,238,0)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0.22)" />
          </linearGradient>
        </defs>

        {/* surveillance range rings + rotating radar sweep */}
        <g opacity={0.5} style={{ pointerEvents: "none" }}>
          {[90, 170, 250, 330].map((r) => (
            <circle key={r} cx={400} cy={300} r={r} fill="none" stroke="#12203044" strokeWidth={0.8} />
          ))}
          <line x1={400} y1={0} x2={400} y2={600} stroke="#12203033" strokeWidth={0.6} />
          <line x1={0} y1={300} x2={800} y2={300} stroke="#12203033" strokeWidth={0.6} />
          <g>
            <path d="M400 300 L400 -40 A340 340 0 0 1 640 60 Z" fill="url(#sweep)" />
            <animateTransform attributeName="transform" type="rotate" from="0 400 300" to="360 400 300" dur="4s" repeatCount="indefinite" />
          </g>
        </g>
        {graph.edges.map((e, i) => {
          const s = graph.nodes.find((n) => n.id === e.source)!;
          const t = graph.nodes.find((n) => n.id === e.target)!;
          const on = hover != null && (e.source === hover || e.target === hover);
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={on ? "var(--accent)" : "#1b2740"}
              strokeWidth={on ? 1.4 : 0.6}
              opacity={hover == null ? 0.5 : on ? 0.9 : 0.12}
            />
          );
        })}
        {graph.nodes.map((n) => {
          const st = KIND_STYLE[n.kind];
          const fill = n.kind === "beneficiary" ? riskColor(n.risk) : st.fill;
          const isBen = n.kind === "beneficiary";
          const dim = hover != null && !active(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              style={{ cursor: interactive && isBen ? "pointer" : "default", opacity: dim ? 0.2 : 1 }}
              onMouseEnter={() => interactive && setHover(n.id)}
              onMouseLeave={() => interactive && setHover(null)}
              onClick={() => interactive && isBen && router.push(`/cases/CASE-${n.id.slice(2)}`)}
            >
              {hover === n.id && <circle r={22} fill="url(#halo)" />}
              {isBen && n.risk >= 75 && (
                <circle r={st.r} fill="none" stroke={fill} strokeWidth={1} className="ping-ring" style={{ transformOrigin: "center" }} />
              )}
              <circle r={st.r} fill={fill} stroke="#05070a" strokeWidth={1} />
              {(hover === n.id || !isBen) && (
                <text x={st.r + 3} y={3} fontSize={9} fill="var(--muted)" className="mono">
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {interactive && (
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 text-[10px] text-[var(--muted)]">
          {Object.entries(KIND_STYLE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: v.fill }} /> {v.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
