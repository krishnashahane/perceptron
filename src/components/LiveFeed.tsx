"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Severity } from "@/lib/types";
import { sevColor } from "@/lib/ui";

export interface FeedItem {
  id: string;
  score: number;
  severity: Severity;
  district: string;
  signals: string[];
}

export default function LiveFeed({ items }: { items: FeedItem[] }) {
  const [feed, setFeed] = useState<{ item: FeedItem; t: string }[]>([]);
  const cursor = useRef(0);
  const [online, setOnline] = useState(true);

  // Poll the server-authoritative detection stream (/api/live). Falls back to
  // the SSR snapshot if the network drops — edge/offline resilient.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const res = await fetch(`/api/live?cursor=${cursor.current}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        cursor.current = data.cursor;
        if (!alive) return;
        setOnline(true);
        for (const e of data.events) {
          const item: FeedItem = { id: e.id, score: e.score, severity: e.severity, district: e.district, signals: e.signals };
          setFeed((f) => [{ item, t: e.t }, ...f].slice(0, 9));
        }
      } catch {
        if (!alive) return;
        setOnline(false);
        const item = items[cursor.current % Math.max(1, items.length)];
        cursor.current++;
        if (item) setFeed((f) => [{ item, t: new Date().toISOString().slice(11, 19) }, ...f].slice(0, 9));
      }
    };
    pull();
    const iv = setInterval(pull, 2200);
    return () => { alive = false; clearInterval(iv); };
  }, [items]);

  return (
    <div className="panel p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--crit)] dot-live" />
          <span className="kicker">sensor-fusion · live detections</span>
        </div>
        <span className="text-[10px]" style={{ color: online ? "var(--accent-2)" : "var(--high)" }}>
          {online ? "◉ stream live" : "◍ offline · cached"}
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {feed.length === 0 &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-16 h-3 rounded skel" />
              <span className="w-1.5 h-6 rounded-sm skel" />
              <span className="flex-1 h-3 rounded skel" />
              <span className="w-8 h-3 rounded skel" />
            </div>
          ))}
        {feed.map(({ item, t }, i) => (
          <Link
            key={`${item.id}-${t}-${i}`}
            href={`/cases/${item.id}`}
            prefetch={false}
            title={`${item.severity.toUpperCase()} · score ${item.score} · ${item.signals.slice(0, 3).join(", ").replace(/_/g, " ")}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-elev)] rise"
          >
            <span className="text-[10px] text-[var(--faint)] tabular-nums w-16 shrink-0">{t}</span>
            <span
              className="w-1.5 h-6 rounded-sm shrink-0"
              style={{ background: sevColor[item.severity] }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--fg)]">{item.id}</span>
                <span className="text-[10px] text-[var(--muted)]">{item.district}</span>
              </div>
              <div className="text-[10px] text-[var(--muted)] truncate">
                {item.signals.slice(0, 3).join(" + ").replace(/_/g, " ")}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[13px] tabular-nums" style={{ color: sevColor[item.severity] }}>
                {item.score}
              </div>
              <div className="text-[9px] text-[var(--faint)] uppercase">{item.severity}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
