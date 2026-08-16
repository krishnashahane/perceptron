"use client";
import { useEffect, useRef, useState } from "react";
import { inr } from "@/lib/ui";

export default function Stat({
  value,
  currency = false,
  decimals = 0,
}: {
  value: number;
  currency?: boolean;
  decimals?: number;
}) {
  const [n, setN] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const dur = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(value * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const shown = currency ? inr(n) : n.toFixed(decimals);
  return <span className="tabular-nums">{shown}</span>;
}
