"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { inr, sevColor } from "@/lib/ui";
import type { Severity } from "@/lib/types";

interface TopCase { id: string; score: number; model: number; severity: Severity; district: string; amountAtRisk: number; labels: string[] }
interface Res {
  rows: number; errors: string[];
  kpis: { totalDisbursed: number; beneficiaries: number; flagged: number; amountAtRisk: number; critical: number; high: number };
  top: TopCase[];
  communities: { id: string; members: number; exposure: number }[];
}

const SAMPLE = `beneficiary_id,name,phone,district,bank_account,contractor_id,address_cluster,amount,payment_ts,inspection_ts,doc_hash,approval_latency_min
BEN-1,A. Kumar,9800000001,Pune,BANK-77,C-1,PUNE-1,80000,2026-06-01T10:00:00Z,2026-06-05,DOC-1,5
BEN-2,B. Singh,9800000001,Pune,BANK-77,C-1,PUNE-1,80000,2026-06-01T10:03:00Z,2026-06-06,DOC-1,4
BEN-3,C. Rao,9800000001,Pune,BANK-77,C-1,PUNE-1,80000,2026-06-01T10:05:00Z,2026-06-04,DOC-1,6
BEN-4,D. Patil,9811111111,Nashik,BANK-90,C-9,NASHIK-4,80000,2026-06-10T09:00:00Z,2026-06-02,DOC-4,320
BEN-5,E. More,9822222222,Latur,BANK-91,C-4,LATUR-2,80000,2026-06-11T09:00:00Z,2026-06-03,DOC-5,410`;

export default function Ingest() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(csv: string) {
    if (!csv.trim()) { setErr("Provide CSV data first."); return; }
    setErr(""); setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error + (data.errors ? `: ${data.errors.join("; ")}` : "")); setBusy(false); return; }
      setRes(data);
    } catch { setErr("Upload failed."); }
    setBusy(false);
  }

  const MAX_BYTES = 4_000_000;
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const okType = /\.csv$/i.test(f.name) || f.type === "text/csv" || f.type === "application/vnd.ms-excel" || f.type === "";
    if (!okType) { setErr(`Unsupported file type (${f.type || "unknown"}). Upload a .csv file.`); return; }
    if (f.size > MAX_BYTES) { setErr(`File too large (${(f.size / 1e6).toFixed(1)} MB). Max 4 MB.`); return; }
    const reader = new FileReader();
    reader.onerror = () => setErr("Could not read file.");
    reader.onload = () => { const t = String(reader.result || ""); setText(t); run(t); };
    reader.readAsText(f);
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "perceptron_sample.csv";
    a.click();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 space-y-4">
        <div className="panel p-4 space-y-3">
          <div className="kicker">upload scheme ledger (csv)</div>
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex-1 bg-[var(--accent)] text-black rounded-md py-2 text-[12px] font-semibold">
              SELECT FILE
            </button>
            <button onClick={downloadSample} className="border border-[var(--border)] rounded-md px-3 text-[11px] text-[var(--muted)] hover:text-[var(--accent)]">
              sample
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="…or paste CSV here"
            rows={7}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-[11px] outline-none focus:border-[var(--accent)] font-[var(--font-geist-mono)]"
          />
          <button onClick={() => run(text)} disabled={busy} className="w-full border border-[var(--accent)] text-[var(--accent)] rounded-md py-2 text-[12px] disabled:opacity-50">
            {busy ? "analyzing…" : "RUN DETECTION ▸"}
          </button>
          {err && <div className="text-[11px] text-[var(--crit)]">✕ {err}</div>}
          <p className="text-[10px] text-[var(--faint)] leading-relaxed">
            Required columns: beneficiary_id, district, bank_account, contractor_id, amount, payment_ts.
            Parsed in-memory, never persisted. Same detection engine as the live console.
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4 min-w-0">
        {!res && !busy && (
          <div className="panel p-10 text-center text-[12px] text-[var(--muted)] hud-frame">
            Awaiting dataset. Detection runs the moment a file lands.
          </div>
        )}
        {res && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi k="rows analyzed" v={res.rows.toLocaleString()} />
              <Kpi k="flagged" v={String(res.kpis.flagged)} c="var(--accent)" />
              <Kpi k="at risk" v={inr(res.kpis.amountAtRisk)} c="var(--high)" />
              <Kpi k="critical" v={String(res.kpis.critical)} c="var(--crit)" />
            </div>
            {res.errors.length > 0 && (
              <div className="panel p-3 text-[10px] text-[var(--high)]">
                {res.errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}
            <div className="panel overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--border)] kicker">detected cases</div>
              {res.top.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-[var(--muted)]">No anomalies detected in this dataset.</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[420px]">
                  <tbody>
                    {res.top.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2 text-[var(--fg)]">{c.id}</td>
                        <td className="px-2 py-2 text-[var(--muted)]">{c.district}</td>
                        <td className="px-2 py-2 text-[var(--muted)] hidden sm:table-cell">{c.labels.length} indicators</td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--muted)]">{inr(c.amountAtRisk)}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold" style={{ color: sevColor[c.severity] }}>{c.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
            {res.communities.length > 0 && (
              <div className="panel p-4">
                <div className="kicker mb-2">rings detected (multi-hop)</div>
                {res.communities.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-[11px] py-1">
                    <span className="text-[var(--fg)]">{c.id}</span>
                    <span className="text-[var(--muted)]">{c.members} members · <span className="text-[var(--high)]">{inr(c.exposure)}</span></span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/command" className="text-[11px] text-[var(--accent)]">← back to live console</Link>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <div className="panel p-3">
      <div className="kicker">{k}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums" style={{ color: c || "var(--fg)" }}>{v}</div>
    </div>
  );
}
