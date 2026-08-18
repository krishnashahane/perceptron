"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BOOT = [
  "PERCEPTRON // Public Resource & Integrity Surveillance Matrix",
  "initializing graph engine ......... ok",
  "loading scheme ledger [1,500 beneficiaries] ...... ok",
  "arming detectors: identity · payment · relationship · geo · process · document",
  "integrity model online — awaiting operator authentication",
];

const HINTS = [
  { u: "analyst", p: "perceptron-analyst", r: "read + export" },
  { u: "investigator", p: "perceptron-invest", r: "investigate + escalate" },
  { u: "admin", p: "perceptron-admin", r: "full control" },
];

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/command";
  const [lines, setLines] = useState<string[]>([]);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setLines(BOOT.slice(0, i));
      if (i >= BOOT.length) {
        clearInterval(t);
        userRef.current?.focus();
      }
    }, 320);
    return () => clearInterval(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Authentication failed");
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setErr("Network error");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5 relative">
      <div className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(60% 50% at 50% 30%, rgba(34,211,238,0.08), transparent 70%)" }} />
      <div className="w-full max-w-xl relative">
        <div className="mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--crit)] dot-live" />
          <span className="kicker">session locked · authenticate to proceed</span>
        </div>

        <div className="panel scan p-5 relative overflow-hidden">
          <div className="text-[13px] leading-6 min-h-[150px]">
            {lines.map((l, i) => (
              <div key={i} className="rise text-[var(--muted)]">
                <span className="text-[var(--accent)]">›</span> {l}
              </div>
            ))}
            {lines.length >= BOOT.length && (
              <div className="text-[var(--accent-2)]">
                <span className="text-[var(--accent)]">›</span> _<span className="caret">▊</span>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="mt-5 hairline pt-5 grid gap-3">
            <div className="grid gap-1.5">
              <label className="kicker">operator id</label>
              <input
                ref={userRef}
                value={user}
                autoComplete="username"
                onChange={(e) => setUser(e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] focus:glow"
                placeholder="analyst"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="kicker">passphrase</label>
              <input
                type="password"
                value={pass}
                autoComplete="current-password"
                onChange={(e) => setPass(e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] focus:glow"
                placeholder="••••••••"
              />
            </div>
            {err && <div className="text-[12px] text-[var(--crit)]">✕ {err}</div>}
            <button
              disabled={busy}
              className="mt-1 bg-[var(--accent)] text-black font-semibold rounded-md py-2.5 text-[13px] tracking-wide hover:brightness-110 disabled:opacity-50 transition"
            >
              {busy ? "authenticating…" : "AUTHENTICATE ▸"}
            </button>
          </form>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {HINTS.map((h) => (
            <button
              key={h.u}
              onClick={() => { setUser(h.u); setPass(h.p); }}
              className="panel panel-hover p-2.5 text-left transition"
            >
              <div className="text-[12px] text-[var(--fg)]">{h.u}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{h.r}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-[var(--faint)] text-center">
          demo credentials · click a role to autofill · session is HMAC-signed, httpOnly, 8h TTL
        </p>
      </div>
    </main>
  );
}
