"use client";
import { useEffect, useState } from "react";

// Bottom operational telemetry strip (ASTRA-style). Live, self-driving HUD
// chrome — communicates "system nominal" at a glance without a backend.
export default function TelemetryBar() {
  const [t, setT] = useState({ cpu: 32, mem: 64, lat: 14, bw: 1.2 });

  useEffect(() => {
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
    const iv = setInterval(() => {
      setT((p) => ({
        cpu: Math.round(clamp(p.cpu + (Math.random() * 8 - 4), 18, 61)),
        mem: Math.round(clamp(p.mem + (Math.random() * 4 - 2), 52, 78)),
        lat: Math.round(clamp(p.lat + (Math.random() * 6 - 3), 8, 34)),
        bw: +clamp(p.bw + (Math.random() * 0.4 - 0.2), 0.6, 2.4).toFixed(1),
      }));
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  const cell = (
    icon: string,
    label: string,
    value: string,
    opts?: { accent?: boolean; vis?: string },
  ) => (
    <div className={`${opts?.vis ?? "flex"} items-center gap-1.5 ${opts?.accent ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
      <span aria-hidden className="text-[var(--faint)] text-[11px]">{icon}</span>
      <span className="text-[var(--faint)] hidden sm:inline">{label}</span>
      <span className="flick tabular-nums" style={opts?.accent ? { color: "var(--accent)" } : undefined}>{value}</span>
    </div>
  );

  return (
    <footer className="sticky bottom-0 z-40 border-t border-[var(--border)] bg-[color:var(--bg-elev)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 h-8 flex items-center gap-4 sm:gap-5 text-[10px] mono">
        {cell("▚", "CPU", `${t.cpu}%`)}
        <Sep />
        {cell("▤", "MEM", `${t.mem}%`)}
        <Sep />
        {cell("◈", "LATENCY", `${t.lat}ms`, { accent: true })}
        <Sep className="hidden sm:block" />
        {cell("⇅", "BW", `${t.bw}G/s`, { vis: "hidden sm:flex" })}
        <Sep className="hidden md:block" />
        {cell("⛨", "THREAT", "ELEVATED", { vis: "hidden md:flex" })}
        <div className="ml-auto flex items-center gap-4 text-[var(--faint)]">
          <span className="hidden lg:inline">detect → correlate → explain → decide → audit</span>
          <span className="flex items-center gap-1.5 text-[var(--accent-2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" /> NOMINAL
          </span>
        </div>
      </div>
    </footer>
  );
}

function Sep({ className = "" }: { className?: string }) {
  return <span className={`w-px h-3 bg-[var(--border-bright)] ${className}`} />;
}
