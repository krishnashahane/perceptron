"use client";
import dynamic from "next/dynamic";
import type { DistrictRisk } from "@/components/MapView";

// Leaflet touches window at import — load client-only, no SSR.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] w-full grid place-items-center text-[11px] text-[var(--muted)]">
      <span className="mono">▚ acquiring geospatial grid…</span>
    </div>
  ),
});

const LEGEND = [
  ["critical", "#ffb4ab", "≥60"],
  ["high", "#ffc98a", "35–59"],
  ["medium", "#ffe08a", "18–34"],
  ["low", "#86e5cf", "<18"],
] as const;

export default function DistrictMap({ districts }: { districts: DistrictRisk[] }) {
  return (
    <div className="panel overflow-hidden hud-frame">
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] dot-live" />
          <span className="kicker">geospatial risk grid · maharashtra</span>
        </div>
        <span className="text-[10px] text-[var(--muted)] mono">LIVE · {districts.length} DISTRICTS</span>
      </div>
      <div className="relative">
        <MapView districts={districts} />
        {/* corner telemetry overlay */}
        <div className="pointer-events-none absolute top-2 left-2 z-[500] px-2 py-1 rounded bg-[color:var(--bg)]/80 border border-[var(--border)] mono text-[9px] text-[var(--muted)] tracking-wider">
          GRID ALPHA · 19.4°N 75.8°E · ZOOM 6
        </div>
      </div>
      <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-4 flex-wrap text-[9px] mono text-[var(--muted)]">
        <span className="text-[var(--faint)] uppercase tracking-widest">risk index</span>
        {LEGEND.map(([label, color, range]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="capitalize">{label}</span>
            <span className="text-[var(--faint)]">{range}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
