import type { Severity } from "@/lib/types";

export const sevColor: Record<Severity, string> = {
  critical: "var(--crit)",
  high: "var(--high)",
  medium: "var(--med)",
  low: "var(--low)",
};

export const sevText: Record<Severity, string> = {
  critical: "text-[color:var(--crit)]",
  high: "text-[color:var(--high)]",
  medium: "text-[color:var(--med)]",
  low: "text-[color:var(--low)]",
};

export function inr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${n}`;
}

export function riskColor(r: number): string {
  if (r >= 75) return "var(--crit)";
  if (r >= 55) return "var(--high)";
  if (r >= 35) return "var(--med)";
  return "var(--low)";
}

export const dimLabel: Record<string, string> = {
  identity: "Identity",
  payment: "Payment",
  relationship: "Relationship",
  geographic: "Geographic",
  process: "Process",
  document: "Document",
};
