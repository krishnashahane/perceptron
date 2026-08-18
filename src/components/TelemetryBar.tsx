import { inr } from "@/lib/ui";

// Bottom status strip — REAL detection metrics, not fake system telemetry.
export default function TelemetryBar({
  flagged,
  rings,
  exposure,
  critical,
}: {
  flagged: number;
  rings: number;
  exposure: number;
  critical: number;
}) {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-[var(--border)] bg-[color:var(--bg-elev)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 h-8 flex items-center gap-4 sm:gap-6 text-[10px] mono">
        <Cell label="FLAGGED CASES" value={flagged.toLocaleString()} />
        <Sep />
        <Cell label="RINGS" value={rings.toLocaleString()} />
        <Sep />
        <Cell label="AT RISK" value={inr(exposure)} accent />
        <Sep className="hidden sm:block" />
        <Cell label="CRITICAL" value={critical.toLocaleString()} vis="hidden sm:flex" crit={critical > 0} />
        <div className="ml-auto flex items-center gap-4 text-[var(--faint)]">
          <span className="hidden lg:inline">detect → correlate → explain → decide → audit</span>
          <span className="flex items-center gap-1.5 text-[var(--accent-2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" /> ENGINE ONLINE
          </span>
        </div>
      </div>
    </footer>
  );
}

function Cell({ label, value, accent, crit, vis = "flex" }: { label: string; value: string; accent?: boolean; crit?: boolean; vis?: string }) {
  const color = crit ? "var(--crit)" : accent ? "var(--high)" : "var(--fg)";
  return (
    <div className={`${vis} items-center gap-1.5`}>
      <span className="text-[var(--faint)]">{label}</span>
      <span className="tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function Sep({ className = "" }: { className?: string }) {
  return <span className={`w-px h-3 bg-[var(--border-bright)] ${className}`} />;
}
