import type { Role } from "@/lib/types";

// Pure, secret-free RBAC — safe to import into client components.
export type Action = "investigate" | "escalate" | "resolve" | "export";

const MATRIX: Record<Role, Action[]> = {
  analyst: ["export"],
  investigator: ["investigate", "escalate", "export"],
  admin: ["investigate", "escalate", "resolve", "export"],
};

export function canAct(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}
