"use client";
import type { RiskDim } from "@/lib/types";
import { dimLabel } from "@/lib/ui";

const ORDER: RiskDim[] = ["identity", "payment", "relationship", "geographic", "process", "document"];

export default function Radar({ dims }: { dims: Record<RiskDim, number> }) {
  const cx = 110, cy = 105, R = 78;
  const pt = (i: number, val: number) => {
    const a = (Math.PI * 2 * i) / ORDER.length - Math.PI / 2;
    const r = (val / 100) * R;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const ring = (f: number) =>
    ORDER.map((_, i) => {
      const a = (Math.PI * 2 * i) / ORDER.length - Math.PI / 2;
      return `${cx + Math.cos(a) * R * f},${cy + Math.sin(a) * R * f}`;
    }).join(" ");
  const poly = ORDER.map((d, i) => pt(i, dims[d]).join(",")).join(" ");

  return (
    <svg viewBox="0 0 220 210" className="w-full max-w-[280px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#141d2b" strokeWidth={0.8} />
      ))}
      {ORDER.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#141d2b" strokeWidth={0.8} />;
      })}
      <polygon points={poly} fill="rgba(34,211,238,0.18)" stroke="var(--accent)" strokeWidth={1.4} />
      {ORDER.map((d, i) => {
        const [x, y] = pt(i, dims[d]);
        return <circle key={d} cx={x} cy={y} r={2.5} fill="var(--accent)" />;
      })}
      {ORDER.map((d, i) => {
        const a = (Math.PI * 2 * i) / ORDER.length - Math.PI / 2;
        const lx = cx + Math.cos(a) * (R + 16);
        const ly = cy + Math.sin(a) * (R + 16);
        return (
          <text key={d} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={8.5} fill="var(--muted)" className="mono">
            {dimLabel[d]}
          </text>
        );
      })}
    </svg>
  );
}
