"use client";
import { useRef, useState } from "react";

const PRESETS = [
  "Why is this case flagged?",
  "Which cases are linked?",
  "What is the financial impact?",
  "Recommend the next action",
];

interface Msg { role: "user" | "perceptron"; text: string; source?: string }

export default function Copilot({ caseId }: { caseId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setQ("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId, question }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "perceptron", text: data.answer || data.error || "No response", source: data.source }]);
    } catch {
      setMsgs((m) => [...m, { role: "perceptron", text: "Copilot unavailable." }]);
    }
    setBusy(false);
    requestAnimationFrame(() => boxRef.current?.scrollTo(0, boxRef.current.scrollHeight));
  }

  return (
    <div className="panel flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] dot-live" />
          <span className="kicker">integrity copilot</span>
        </div>
        <span className="text-[9px] text-[var(--muted)]">grounded · human-in-loop</span>
      </div>

      <div ref={boxRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[180px] max-h-[340px]">
        {msgs.length === 0 && (
          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            Ask about this case. Answers are grounded strictly in detected evidence — no invented facts.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`rise ${m.role === "user" ? "text-right" : ""}`}>
            <div
              className={`inline-block text-[12px] leading-relaxed rounded-lg px-3 py-2 max-w-[92%] text-left ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg)]"
              }`}
            >
              {m.text}
              {m.role === "perceptron" && m.source && (
                <span className="block mt-1 text-[9px] text-[var(--faint)] uppercase tracking-wider">
                  {m.source === "ai" ? "◆ ai-synthesized" : "◆ deterministic · offline-capable"}
                </span>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-[11px] text-[var(--muted)]">analyzing<span className="caret">▊</span></div>}
      </div>

      <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-[var(--border)]">
        {PRESETS.map((p) => (
          <button key={p} onClick={() => ask(p)} disabled={busy}
            className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] border border-[var(--border)] rounded px-2 py-1 transition disabled:opacity-40">
            {p}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="p-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ask the copilot…"
          maxLength={280}
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
        />
        <button disabled={busy} className="bg-[var(--accent)] text-black rounded-md px-3 text-[12px] font-semibold disabled:opacity-50">▸</button>
      </form>
    </div>
  );
}
