import { runEngine } from "@/lib/engine";
import type { Case, Dataset, EngineResult } from "@/lib/types";

// NOTE (architecture): all detection/scoring runs SERVER-SIDE. This module is
// imported only by RSC pages and Node route handlers — never shipped to the
// client. State is in-memory, per server instance (no DB): fine for the demo,
// but the planned production path moves this to Postgres/Neo4j for persistence
// and multi-instance consistency. See README "known limitations".
// Compute the universe once per server process (deterministic, cache-safe).
let cache: { data: Dataset; result: EngineResult } | null = null;

export function engine() {
  if (!cache) cache = runEngine({ seed: 42, beneficiaries: 1500 });
  return cache;
}

export function getResult(): EngineResult {
  return engine().result;
}

export function getCase(id: string): { c: Case; ben: Dataset["beneficiaries"][number] } | null {
  const { data, result } = engine();
  const c = result.cases.find((x) => x.id === id);
  if (!c) return null;
  const ben = data.beneficiaries.find((b) => b.id === c.beneficiaryId)!;
  return { c, ben };
}

export interface SimCase { id: string; amt: number; bank: string; contractor: string; score: number; district: string }
export function getSimulation(): { hubs: EngineResult["hubs"]; cases: SimCase[]; totalExposure: number } {
  const { data, result } = engine();
  const benById = new Map(data.beneficiaries.map((b) => [b.id, b]));
  const cases: SimCase[] = result.cases.map((c) => {
    const b = benById.get(c.beneficiaryId)!;
    return { id: c.id, amt: c.amountAtRisk, bank: b.bankAccountId, contractor: b.contractorId, score: c.score, district: c.district };
  });
  return { hubs: result.hubs, cases, totalExposure: result.kpis.amountAtRisk };
}
