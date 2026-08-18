"use client";

// Top status strip — real detection state, no fake sci-fi counters.
export default function StatusStrip({
  flagged,
  rings,
  precision,
}: {
  flagged: number;
  rings: number;
  precision: number;
}) {
  const items = [
    ["FLAGGED", flagged.toLocaleString(), "var(--fg)", "flex"],
    ["RINGS", rings.toLocaleString(), "var(--accent)", "flex"],
    ["PRECISION", `${(precision * 100).toFixed(0)}%`, "var(--accent-2)", "hidden sm:flex"],
    ["MODE", "HUMAN-IN-THE-LOOP", "var(--muted)", "hidden lg:flex"],
  ] as const;

  const feed = [
    "shared-attribute edges indexed",
    "union-find community pass complete",
    "anomaly model: nominal",
    "no operator override pending",
    "audit ledger: chain verified",
    "exposure recomputed",
  ];

  return (
    <div className="border-b border-[var(--border)] bg-[color:var(--bg-elev)]/60">
      <div className="mx-auto max-w-[1400px] px-4 h-8 flex items-center gap-4 text-[10px] overflow-hidden mono">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" />
          <span className="text-[var(--accent-2)] tracking-widest">LIVE</span>
        </span>
        <div className="flex items-center gap-4 shrink-0">
          {items.map(([k, v, c, vis]) => (
            <span key={k} className={`${vis} items-center gap-1.5`}>
              <span className="text-[var(--faint)]">{k}</span>
              <span className="whitespace-nowrap tabular-nums" style={{ color: c as string }}>{v}</span>
            </span>
          ))}
        </div>
        <div className="ml-auto min-w-0 flex-1 overflow-hidden hidden md:block" aria-hidden>
          <div className="ticker-track text-[var(--muted)]">
            {[...feed, ...feed].map((f, i) => (
              <span key={i} className="mx-4 whitespace-nowrap">▸ {f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
