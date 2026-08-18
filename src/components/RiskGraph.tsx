"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { RiskGraph as RG, Community } from "@/lib/types";
import { riskColor } from "@/lib/ui";

const KIND_STYLE = {
  beneficiary: { r: 5, fill: "var(--accent)", label: "Beneficiary" },
  bank: { r: 9, fill: "#ff6b7a", label: "Bank a/c" },
  contractor: { r: 8, fill: "#ffb066", label: "Contractor" },
  official: { r: 8, fill: "#a78bfa", label: "Official" },
} as const;

const W = 800, H = 600;

interface Props {
  graph: RG;
  communities?: Community[];
  interactive?: boolean;
  /** ring ids to render by default (top rings). If undefined + showAll false, all shown. */
  visibleRings?: string[];
  showAll?: boolean;
  selectedRing?: string | null;
  hoverRing?: string | null;
  onSelectRing?: (id: string | null) => void;
}

// Deterministic seeded PRNG so the layout is identical across reloads (seed 42 ethos).
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export default function RiskGraph({
  graph,
  communities = [],
  interactive = true,
  visibleRings,
  showAll = false,
  selectedRing = null,
  hoverRing = null,
  onSelectRing,
}: Props) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  // adjacency for neighbour highlighting + hub ring inference
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target);
      (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source);
    }
    return m;
  }, [graph.edges]);

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  // ring a node belongs to: beneficiaries carry it; hubs inherit the dominant
  // ring of their connected beneficiaries.
  const ringOf = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const n of graph.nodes) m.set(n.id, n.kind === "beneficiary" ? n.ring : null);
    for (const n of graph.nodes) {
      if (n.kind === "beneficiary") continue;
      const counts = new Map<string, number>();
      for (const nb of adj.get(n.id) ?? []) {
        const r = byId.get(nb)?.ring;
        if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
      }
      let best: string | null = null, bc = 0;
      for (const [r, c] of counts) if (c > bc) { best = r; bc = c; }
      m.set(n.id, best);
    }
    return m;
  }, [graph.nodes, adj, byId]);

  // which nodes are visible
  const visibleSet = useMemo(() => {
    if (showAll) return new Set(graph.nodes.map((n) => n.id));
    const rings = new Set(visibleRings ?? communities.slice(0, 5).map((c) => c.id));
    if (rings.size === 0) return new Set(graph.nodes.map((n) => n.id)); // no ring data → show all
    const vis = new Set<string>();
    for (const n of graph.nodes) if (n.kind === "beneficiary" && n.ring && rings.has(n.ring)) vis.add(n.id);
    // hubs visible when they connect to a visible beneficiary
    for (const n of graph.nodes) {
      if (n.kind === "beneficiary") continue;
      for (const nb of adj.get(n.id) ?? []) if (vis.has(nb)) { vis.add(n.id); break; }
    }
    return vis;
  }, [showAll, visibleRings, communities, graph.nodes, adj]);

  const nodes = useMemo(() => graph.nodes.filter((n) => visibleSet.has(n.id)), [graph.nodes, visibleSet]);
  const edges = useMemo(
    () => graph.edges.filter((e) => visibleSet.has(e.source) && visibleSet.has(e.target)),
    [graph.edges, visibleSet],
  );

  // ── Force-directed layout with per-ring clustering, deterministic ──
  const pos = useMemo(() => {
    const ids = nodes.map((n) => n.id);
    const idx = new Map(ids.map((id, i) => [id, i]));
    const N = ids.length;
    const rand = rng(1337 + N);

    // ring anchors on a big circle so clusters start separated
    const rings = [...new Set(nodes.map((n) => ringOf.get(n.id)).filter(Boolean))] as string[];
    const anchor = new Map<string, [number, number]>();
    rings.forEach((r, i) => {
      const a = (i / Math.max(rings.length, 1)) * Math.PI * 2;
      anchor.set(r, [W / 2 + Math.cos(a) * 220, H / 2 + Math.sin(a) * 160]);
    });

    const px = new Float64Array(N), py = new Float64Array(N);
    nodes.forEach((n, i) => {
      const a = anchor.get(ringOf.get(n.id) ?? "") ?? [W / 2, H / 2];
      px[i] = a[0] + (rand() - 0.5) * 80;
      py[i] = a[1] + (rand() - 0.5) * 80;
    });

    const E = edges.map((e) => [idx.get(e.source)!, idx.get(e.target)!] as [number, number]);
    const iters = N > 90 ? 160 : 300;
    const k = 34; // ideal edge length
    for (let it = 0; it < iters; it++) {
      const fx = new Float64Array(N), fy = new Float64Array(N);
      // repulsion (O(n^2), fine at this scale)
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          let dx = px[i] - px[j], dy = py[i] - py[j];
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = rand() - 0.5; dy = rand() - 0.5; d2 = 0.01; }
          const f = (k * k) / d2;
          const d = Math.sqrt(d2);
          fx[i] += (dx / d) * f; fy[i] += (dy / d) * f;
          fx[j] -= (dx / d) * f; fy[j] -= (dy / d) * f;
        }
      }
      // spring attraction along edges
      for (const [a, b] of E) {
        const dx = px[a] - px[b], dy = py[a] - py[b];
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - k) / d * 0.5;
        fx[a] -= dx * f; fy[a] -= dy * f;
        fx[b] += dx * f; fy[b] += dy * f;
      }
      // pull toward own ring anchor (keeps clusters distinct)
      for (let i = 0; i < N; i++) {
        const a = anchor.get(ringOf.get(ids[i]) ?? "");
        if (a) { fx[i] += (a[0] - px[i]) * 0.02; fy[i] += (a[1] - py[i]) * 0.02; }
      }
      const damp = Math.max(0.6, 4 - it * 0.05);
      for (let i = 0; i < N; i++) {
        px[i] += Math.max(-damp * 6, Math.min(damp * 6, fx[i]));
        py[i] += Math.max(-damp * 6, Math.min(damp * 6, fy[i]));
      }
    }
    // fit to viewport with padding
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (let i = 0; i < N; i++) { minx = Math.min(minx, px[i]); maxx = Math.max(maxx, px[i]); miny = Math.min(miny, py[i]); maxy = Math.max(maxy, py[i]); }
    const pad = 40;
    const sx = (W - pad * 2) / Math.max(maxx - minx, 1), sy = (H - pad * 2) / Math.max(maxy - miny, 1);
    const s = Math.min(sx, sy);
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => map.set(n.id, { x: pad + (px[i] - minx) * s, y: pad + (py[i] - miny) * s }));
    return map;
  }, [nodes, edges, ringOf]);

  const activeRing = hoverRing ?? selectedRing;
  const P = (id: string) => pos.get(id) ?? { x: W / 2, y: H / 2 };

  // node emphasis: hovered node's neighbourhood, or the active ring
  const emphasized = (id: string) => {
    if (hover) return hover === id || adj.get(hover)?.has(id);
    if (activeRing) return ringOf.get(id) === activeRing;
    return true;
  };
  const anyFocus = hover != null || activeRing != null;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Collusion relationship network">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(179,200,232,0.28)" />
            <stop offset="100%" stopColor="rgba(179,200,232,0)" />
          </radialGradient>
        </defs>

        {edges.map((e, i) => {
          const s = P(e.source), t = P(e.target);
          const on = (hover != null && (e.source === hover || e.target === hover)) ||
            (activeRing != null && (ringOf.get(e.source) === activeRing || ringOf.get(e.target) === activeRing));
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={on ? "var(--accent)" : "var(--border-bright)"}
              strokeWidth={on ? 1.4 : 0.6}
              opacity={!anyFocus ? 0.45 : on ? 0.9 : 0.08}
            />
          );
        })}

        {nodes.map((n) => {
          const st = KIND_STYLE[n.kind];
          const fill = n.kind === "beneficiary" ? riskColor(n.risk) : st.fill;
          const isBen = n.kind === "beneficiary";
          const p = P(n.id);
          const dim = anyFocus && !emphasized(n.id);
          const showLabel = hover === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x} ${p.y})`}
              style={{ cursor: interactive ? "pointer" : "default", opacity: dim ? 0.14 : 1, transition: "opacity .15s" }}
              onMouseEnter={() => interactive && setHover(n.id)}
              onMouseLeave={() => interactive && setHover(null)}
              onClick={() => {
                if (!interactive) return;
                if (isBen) router.push(`/cases/CASE-${n.id.slice(2)}`);
                else onSelectRing?.(ringOf.get(n.id) ?? null);
              }}
            >
              <title>
                {isBen
                  ? `${n.label} · integrity risk ${n.risk}/100 — click to open case`
                  : `${st.label} ${n.label} · shared hub`}
              </title>
              {hover === n.id && <circle r={20} fill="url(#halo)" />}
              <circle r={st.r} fill={fill} stroke="var(--bg)" strokeWidth={1.2} />
              {showLabel && (
                <text x={st.r + 4} y={3} fontSize={10} fill="var(--fg)" className="mono" style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 3 }}>
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 text-[10px] text-[var(--muted)] pointer-events-none">
        {Object.entries(KIND_STYLE).filter(([k]) => k !== "official").map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: v.fill }} /> {v.label}
          </span>
        ))}
      </div>
      {nodes.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-[11px] text-[var(--muted)] mono">no ring selected</div>
      )}
    </div>
  );
}
