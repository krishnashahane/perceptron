"use client";
import { useState } from "react";
import type { Role } from "@/lib/types";
import { canAct } from "@/lib/rbac";

const ACTIONS: { key: "investigate" | "escalate" | "resolve" | "export"; label: string; tone: string }[] = [
  { key: "investigate", label: "OPEN INVESTIGATION", tone: "var(--accent)" },
  { key: "escalate", label: "ESCALATE", tone: "var(--high)" },
  { key: "resolve", label: "MARK FALSE POSITIVE", tone: "var(--low)" },
  { key: "export", label: "EXPORT REPORT", tone: "var(--muted)" },
];

export default function CaseActions({ caseId, role }: { caseId: string; role: Role }) {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<string>("");

  async function act(action: string, label: string) {
    setBusy(action);
    setStatus("");
    try {
      const res = await fetch("/api/case-action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId, action }),
      });
      const data = await res.json();
      setStatus(res.ok ? `✓ ${label} recorded to audit trail` : `✕ ${data.error}`);
    } catch {
      setStatus("✕ network error");
    }
    setBusy("");
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => {
          const allowed = canAct(role, a.key);
          return (
            <button
              key={a.key}
              disabled={!allowed || !!busy}
              onClick={() => act(a.key, a.label)}
              title={allowed ? "" : `Requires elevated role (you are ${role})`}
              className="text-[11px] tracking-wide border rounded-md py-2 transition disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-elev)]"
              style={{ borderColor: "var(--border)", color: allowed ? a.tone : "var(--faint)" }}
            >
              {busy === a.key ? "…" : a.label}
            </button>
          );
        })}
      </div>
      {status && <div className="text-[11px] text-[var(--muted)]">{status}</div>}
      <p className="text-[10px] text-[var(--faint)]">
        Human-in-the-loop: PERCEPTRON recommends, an authorized officer decides. Every click is attributable.
      </p>
    </div>
  );
}
