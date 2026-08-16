import type { Case } from "@/lib/types";
import { inr } from "@/lib/ui";

// Deterministic, evidence-grounded explanation. Works with zero connectivity —
// the AI layer (if a key is present) only rephrases these facts, never invents them.
export function groundedFacts(c: Case): string[] {
  const facts: string[] = [];
  for (const e of c.evidence) {
    const peers = e.refs.filter((r) => r.startsWith("B-"));
    facts.push(`${e.detail}${peers.length ? ` (linked: ${peers.slice(0, 4).join(", ")})` : ""}`);
  }
  return facts;
}

export function offlineAnswer(c: Case, q: string): string {
  const facts = groundedFacts(c);
  const linked = new Set<string>();
  c.evidence.forEach((e) => e.refs.filter((r) => r.startsWith("B-")).forEach((r) => linked.add(r)));
  const ql = q.toLowerCase();

  if (/link|connect|related|ring|cluster|network/.test(ql)) {
    return linked.size
      ? `${c.id} is connected to ${linked.size} other beneficiaries through shared attributes: ${[...linked].slice(0, 6).join(", ")}. The strongest tie is the ${c.evidence[0].dim} signal — ${c.evidence[0].detail.toLowerCase()}. Treat these as one investigative unit, not isolated files.`
      : `${c.id} shows anomalies but no strong shared-entity link to other beneficiaries yet.`;
  }
  if (/impact|money|amount|financial|cost|loss/.test(ql)) {
    return `Direct exposure on ${c.id} is ${inr(c.amountAtRisk)}. If the surrounding cluster follows the same pattern, exposure scales with every linked beneficiary. This is potential loss avoided by intervening before disbursement closure — not a confirmed loss.`;
  }
  if (/action|recommend|next|do|should/.test(ql)) {
    const step = c.severity === "critical" ? "Escalate to field verification immediately and freeze the next installment." : "Queue for desk review and request source documents.";
    return `Recommended: ${step} Priority driver is the ${c.evidence[0].dim} signal. Decision stays with the officer — PERCEPTRON only ranks and explains.`;
  }
  // default: why flagged
  return `${c.id} scored ${c.score}/100 (${c.severity}). It was flagged because ${facts.length} independent indicators aligned: ${facts.slice(0, 5).map((f) => "• " + f).join("  ")}. No single indicator is conclusive; the combination is what raises risk.`;
}

export function buildPrompt(c: Case, q: string): string {
  const facts = groundedFacts(c).map((f) => "- " + f).join("\n");
  return [
    "You are PERCEPTRON, a government fund-integrity analyst. Answer ONLY from the FACTS.",
    "Never invent names, amounts, or links. Be concise (max 90 words), neutral, and note that findings are indicators requiring human review — not proof of guilt.",
    `CASE: ${c.id} | score ${c.score}/100 (${c.severity}) | district ${c.district} | exposure ${inr(c.amountAtRisk)}`,
    "FACTS:",
    facts,
    `QUESTION: ${q}`,
  ].join("\n");
}
