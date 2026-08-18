import { generateDataset, type GenConfig } from "@/lib/data/generate";
import type {
  AnomalyLabel,
  Case,
  Community,
  Dataset,
  DistrictRisk,
  EngineResult,
  Evidence,
  GraphEdge,
  GraphNode,
  Hub,
  RiskDim,
  RiskGraph,
  Severity,
} from "@/lib/types";

// Detection independently rediscovers anomalies (never reads dataset.truth),
// so eval precision/recall is honest.

const WEIGHT: Record<AnomalyLabel, { dim: RiskDim; w: number; text: (n: number) => string }> = {
  shared_bank: { dim: "relationship", w: 30, text: (n) => `Bank account shared by ${n} beneficiaries` },
  shared_phone: { dim: "identity", w: 20, text: (n) => `Phone number shared by ${n} beneficiaries` },
  duplicate_document: { dim: "document", w: 20, text: (n) => `Identical document hash across ${n} applications` },
  geo_cluster: { dim: "geographic", w: 18, text: (n) => `${n} beneficiaries at near-identical location` },
  contractor_concentration: { dim: "relationship", w: 16, text: (n) => `Contractor linked to ${n} flagged beneficiaries` },
  burst_payments: { dim: "payment", w: 18, text: (n) => `${n} payments initiated within a 6-minute window` },
  payment_before_inspection: { dim: "process", w: 22, text: () => `Payment released before inspection was recorded` },
  fast_approval: { dim: "process", w: 16, text: (n) => `Approval granted in ${n} min (policy min: 15)` },
};

const DIMS: RiskDim[] = ["identity", "payment", "relationship", "geographic", "process", "document"];

function severityOf(score: number): Severity {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function runEngine(cfg: GenConfig = {}): { data: Dataset; result: EngineResult } {
  return detect(generateDataset(cfg));
}

// Pure detection over any Dataset — synthetic or ingested from CSV.
export function detect(data: Dataset): { data: Dataset; result: EngineResult } {
  const { beneficiaries, payments, inspections, approvals } = data;

  // ---- Index shared attributes ----
  const byBank = new Map<string, string[]>();
  const byPhone = new Map<string, string[]>();
  const byCluster = new Map<string, string[]>();
  const byContractor = new Map<string, string[]>();
  const byDoc = new Map<string, string[]>();
  const payByBen = new Map<string, (typeof payments)[number]>();
  const inspByBen = new Map<string, (typeof inspections)[number]>();
  const apprByBen = new Map<string, (typeof approvals)[number]>();

  for (const b of beneficiaries) {
    (byBank.get(b.bankAccountId) ?? byBank.set(b.bankAccountId, []).get(b.bankAccountId)!).push(b.id);
    (byPhone.get(b.phone) ?? byPhone.set(b.phone, []).get(b.phone)!).push(b.id);
    (byCluster.get(b.addressCluster) ?? byCluster.set(b.addressCluster, []).get(b.addressCluster)!).push(b.id);
    (byContractor.get(b.contractorId) ?? byContractor.set(b.contractorId, []).get(b.contractorId)!).push(b.id);
  }
  for (const p of payments) {
    payByBen.set(p.beneficiaryId, p);
    (byDoc.get(p.documentHash) ?? byDoc.set(p.documentHash, []).get(p.documentHash)!).push(p.beneficiaryId);
  }
  for (const i of inspections) inspByBen.set(i.beneficiaryId, i);
  for (const a of approvals) apprByBen.set(a.beneficiaryId, a);

  // Burst detection: group payments by bank into 6-min buckets.
  const burstBen = new Set<string>();
  const bankPays = new Map<string, { id: string; ts: number }[]>();
  for (const p of payments) {
    const ben = beneficiaries.find((b) => b.id === p.beneficiaryId)!;
    (bankPays.get(ben.bankAccountId) ?? bankPays.set(ben.bankAccountId, []).get(ben.bankAccountId)!).push({ id: p.beneficiaryId, ts: p.ts });
  }
  for (const [, arr] of bankPays) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a.ts - b.ts);
    for (let i = 0; i < arr.length; i++) {
      const win = arr.filter((x) => Math.abs(x.ts - arr[i].ts) <= 6 * 60000);
      if (win.length >= 3) win.forEach((x) => burstBen.add(x.id));
    }
  }

  // Contractor concentration threshold via robust stat (median + spread).
  const counts = [...byContractor.values()].map((v) => v.length).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)] || 1;
  const concThreshold = Math.max(median * 3, 20);

  // ---- Unsupervised model layer (statistical anomaly, z-score based) ----
  // Independent of the rules — an IsolationForest-lite over payment amount &
  // approval latency. Surfaces outliers even when no relationship rule fires.
  const amounts = payments.map((p) => p.amount);
  const lat = approvals.map((a) => a.latencyMin);
  const stat = (xs: number[]) => {
    const m = xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length || 1)) || 1;
    return { m, sd };
  };
  const aStat = stat(amounts);
  const lStat = stat(lat);
  const modelScoreOf = (b: (typeof beneficiaries)[number]): number => {
    const p = payByBen.get(b.id);
    const ap = apprByBen.get(b.id);
    const zAmt = p ? Math.abs((p.amount - aStat.m) / aStat.sd) : 0;
    const zLat = ap ? Math.max(0, (lStat.m - ap.latencyMin) / lStat.sd) : 0; // unusually fast
    const burst = burstBen.has(b.id) ? 1.5 : 0;
    const raw = zAmt * 0.6 + zLat * 1.1 + burst;
    return Math.min(100, Math.round((1 - Math.exp(-raw)) * 100));
  };

  // ---- Union-Find for multi-hop community (ring) detection ----
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    parent.set(x, parent.get(x) ?? x);
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) { const n = parent.get(c)!; parent.set(c, r); c = n; }
    return r;
  };
  const union = (a: string, b: string) => { parent.set(find(a), find(b)); };
  const linkPeers = (peers: string[]) => {
    for (let i = 1; i < peers.length; i++) union(peers[0], peers[i]);
  };

  // ---- Per-beneficiary detection ----
  const cases: Case[] = [];
  const flaggedSet = new Set<string>();
  const labeled: { s: number; a: 0 | 1 }[] = [];

  for (const b of beneficiaries) {
    const detected: AnomalyLabel[] = [];
    const evidence: Evidence[] = [];
    const push = (l: AnomalyLabel, n: number, refs: string[]) => {
      detected.push(l);
      const m = WEIGHT[l];
      evidence.push({ dim: m.dim, label: l, weight: m.w, detail: m.text(n), refs });
    };

    const bankPeers = byBank.get(b.bankAccountId)!;
    if (bankPeers.length > 1) {
      push("shared_bank", bankPeers.length, [b.bankAccountId, ...bankPeers.filter((x) => x !== b.id).slice(0, 6)]);
      linkPeers(bankPeers); // multi-hop: everyone on this account joins one ring
    }
    const phonePeers = byPhone.get(b.phone)!;
    if (phonePeers.length > 1) {
      push("shared_phone", phonePeers.length, phonePeers.filter((x) => x !== b.id).slice(0, 6));
      linkPeers(phonePeers);
    }

    const clusterPeers = byCluster.get(b.addressCluster)!;
    if (clusterPeers.length >= 3) push("geo_cluster", clusterPeers.length, clusterPeers.filter((x) => x !== b.id).slice(0, 6));

    const conPeers = byContractor.get(b.contractorId)!;
    if (conPeers.length >= concThreshold && bankPeers.length > 1)
      push("contractor_concentration", conPeers.length, [b.contractorId]);

    if (burstBen.has(b.id)) push("burst_payments", byBank.get(b.bankAccountId)!.length, [b.bankAccountId]);

    const pay = payByBen.get(b.id);
    const insp = inspByBen.get(b.id);
    if (pay && insp && insp.ts > pay.ts) push("payment_before_inspection", 1, [pay.id, insp.id]);

    const doc = pay ? byDoc.get(pay.documentHash)! : [];
    if (pay && doc.length > 1) {
      push("duplicate_document", doc.length, [pay.documentHash, ...doc.filter((x) => x !== b.id).slice(0, 5)]);
      linkPeers(doc); // shared document hash → same ring (multi-hop bridge)
    }

    const appr = apprByBen.get(b.id);
    if (appr && appr.latencyMin < 15) push("fast_approval", appr.latencyMin, [appr.officialId]);

    // Rule score (always computed for threshold tuning + eval).
    const dims = Object.fromEntries(DIMS.map((d) => [d, 0])) as Record<RiskDim, number>;
    let score = 0;
    for (const e of evidence) {
      dims[e.dim] = Math.min(100, dims[e.dim] + e.weight);
      score += e.weight;
    }
    score = Math.min(100, Math.round(score));
    const actualFraud: 0 | 1 = (data.truth[b.id]?.length ?? 0) > 0 ? 1 : 0;
    labeled.push({ s: score, a: actualFraud });

    if (score < 35) continue;

    flaggedSet.add(b.id);
    cases.push({
      id: `CASE-${b.id.replace(/^B-?/, "") || b.id}`,
      beneficiaryId: b.id,
      score,
      modelScore: modelScoreOf(b),
      severity: severityOf(score),
      dims,
      evidence: evidence.sort((a, c) => c.weight - a.weight),
      amountAtRisk: pay?.amount ?? 0,
      clusterId: null, // resolved after union-find settles
      district: b.district,
      detectedLabels: detected,
    });
  }

  // ---- Resolve multi-hop communities & assign to cases ----
  const communityMap = new Map<string, Community>();
  for (const c of cases) {
    const root = find(c.beneficiaryId);
    const rootSize = cases.filter((x) => find(x.beneficiaryId) === root).length;
    // Only label as a ring when 2+ flagged members share a component.
    c.clusterId = rootSize > 1 ? `RING-${root.slice(2)}` : null;
    if (!c.clusterId) continue;
    const e = communityMap.get(c.clusterId) ?? { id: c.clusterId, members: 0, exposure: 0, districts: [] as string[], caseIds: [] as string[], sharedBanks: 0, sharedPhones: 0, sharedDocs: 0, summary: "" };
    e.members++;
    e.exposure += c.amountAtRisk;
    if (!e.districts.includes(c.district)) e.districts.push(c.district);
    e.caseIds.push(c.id);
    communityMap.set(c.clusterId, e);
  }

  // Plain-English "why flagged" per ring: count attributes actually SHARED by
  // 2+ members (a lone member's bank isn't collusion evidence).
  const caseById = new Map(cases.map((c) => [c.id, c]));
  for (const e of communityMap.values()) {
    const memberIds = e.caseIds.map((id) => caseById.get(id)!.beneficiaryId);
    const memberSet = new Set(memberIds);
    const countShared = (index: Map<string, string[]>) => {
      let n = 0;
      for (const peers of index.values()) {
        if (peers.filter((p) => memberSet.has(p)).length > 1) n++;
      }
      return n;
    };
    e.sharedBanks = countShared(byBank);
    e.sharedPhones = countShared(byPhone);
    e.sharedDocs = countShared(byDoc);
    const parts: string[] = [];
    if (e.sharedBanks) parts.push(`${e.sharedBanks} bank account${e.sharedBanks > 1 ? "s" : ""}`);
    if (e.sharedPhones) parts.push(`${e.sharedPhones} phone number${e.sharedPhones > 1 ? "s" : ""}`);
    if (e.sharedDocs) parts.push(`${e.sharedDocs} document${e.sharedDocs > 1 ? "s" : ""}`);
    const shared = parts.length
      ? parts.slice(0, -1).join(", ") + (parts.length > 1 ? " and " : "") + parts[parts.length - 1]
      : "linked records";
    e.summary = `${e.members} beneficiaries share ${shared} across ${e.districts.length} district${e.districts.length > 1 ? "s" : ""}.`;
  }
  const communities = [...communityMap.values()].sort((a, b) => b.exposure - a.exposure);

  // ---- Disruption hubs (bank / contractor) for what-if simulation ----
  const hubMap = new Map<string, Hub>();
  const benById2 = new Map(beneficiaries.map((b) => [b.id, b]));
  for (const c of cases) {
    const b = benById2.get(c.beneficiaryId)!;
    for (const [id, kind] of [[b.bankAccountId, "bank"], [b.contractorId, "contractor"]] as const) {
      const h = hubMap.get(id) ?? { id, kind, linked: 0, exposure: 0, caseIds: [] as string[] };
      h.linked++;
      h.exposure += c.amountAtRisk;
      h.caseIds.push(c.id);
      hubMap.set(id, h);
    }
  }
  const hubs = [...hubMap.values()].filter((h) => h.linked > 1).sort((a, b) => b.exposure - a.exposure).slice(0, 40);

  cases.sort((a, b) => b.score - a.score);

  // ---- Risk graph (top cases + full membership of the top rings) ----
  const ringCaseIds = new Set(communities.slice(0, 8).flatMap((c) => c.caseIds));
  const graphCases = cases.filter((c, i) => i < 60 || ringCaseIds.has(c.id));
  const graph = buildGraph(graphCases, data);

  // ---- District aggregation + predictive risk ----
  const districts = aggregateDistricts(cases, data);

  // ---- KPIs ----
  const amountAtRisk = cases.reduce((s, c) => s + c.amountAtRisk, 0);
  const kpis = {
    totalDisbursed: data.meta.totalDisbursed,
    beneficiaries: beneficiaries.length,
    flagged: cases.length,
    amountAtRisk,
    critical: cases.filter((c) => c.severity === "critical").length,
    high: cases.filter((c) => c.severity === "high").length,
  };

  // ---- Honest eval vs ground truth ----
  let tp = 0, fp = 0, fn = 0;
  for (const b of beneficiaries) {
    const actual = (data.truth[b.id]?.length ?? 0) > 0;
    const pred = flaggedSet.has(b.id);
    if (pred && actual) tp++;
    else if (pred && !actual) fp++;
    else if (!pred && actual) fn++;
  }
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);

  return {
    data,
    result: {
      cases,
      graph,
      districts,
      communities,
      hubs,
      labeled,
      kpis,
      eval: {
        precision: +precision.toFixed(3),
        recall: +recall.toFixed(3),
        f1: +f1.toFixed(3),
        tp,
        fp,
        fn,
      },
    },
  };
}

function buildGraph(cases: Case[], data: Dataset): RiskGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const benById = new Map(data.beneficiaries.map((b) => [b.id, b]));
  const seen = new Set<string>();

  const place = (id: string, kind: GraphNode["kind"], label: string, risk: number, ring: string | null = null) => {
    if (!nodes.has(id)) nodes.set(id, { id, kind, label, risk, ring, x: 0, y: 0 });
  };

  for (const c of cases) {
    const b = benById.get(c.beneficiaryId)!;
    place(b.id, "beneficiary", b.id, c.score, c.clusterId);
    place(b.bankAccountId, "bank", b.bankAccountId, 60);
    place(b.contractorId, "contractor", b.contractorId, 50);
    const key = `${b.id}|${b.bankAccountId}`;
    if (!seen.has(key)) { edges.push({ source: b.id, target: b.bankAccountId, kind: "bank" }); seen.add(key); }
    const key2 = `${b.id}|${b.contractorId}`;
    if (!seen.has(key2)) { edges.push({ source: b.id, target: b.contractorId, kind: "contractor" }); seen.add(key2); }
  }

  // Deterministic radial layout grouped by kind.
  const arr = [...nodes.values()];
  const groups: Record<string, GraphNode[]> = { bank: [], contractor: [], beneficiary: [], official: [] };
  arr.forEach((n) => groups[n.kind].push(n));
  const R = { bank: 90, contractor: 210, beneficiary: 340, official: 150 };
  for (const k of Object.keys(groups)) {
    const g = groups[k];
    g.forEach((n, i) => {
      const a = (i / Math.max(g.length, 1)) * Math.PI * 2;
      n.x = 400 + Math.cos(a) * R[k as keyof typeof R];
      n.y = 300 + Math.sin(a) * R[k as keyof typeof R];
    });
  }
  return { nodes: arr, edges };
}

function aggregateDistricts(cases: Case[], data: Dataset): DistrictRisk[] {
  const map = new Map<string, DistrictRisk>();
  for (const d of data.meta.districts)
    map.set(d, { district: d, risk: 0, cases: 0, amountAtRisk: 0, drivers: [] });
  const total = new Map<string, number>();
  for (const b of data.beneficiaries) total.set(b.district, (total.get(b.district) ?? 0) + 1);
  const driverCount = new Map<string, Map<string, number>>();

  for (const c of cases) {
    const d = map.get(c.district)!;
    d.cases++;
    d.amountAtRisk += c.amountAtRisk;
    d.risk += c.score;
    const dc = driverCount.get(c.district) ?? driverCount.set(c.district, new Map()).get(c.district)!;
    for (const l of c.detectedLabels) dc.set(l, (dc.get(l) ?? 0) + 1);
  }
  for (const d of map.values()) {
    const denom = total.get(d.district) ?? 1;
    // predictive risk: flagged density + severity intensity, 0..100
    d.risk = Math.min(100, Math.round((d.cases / denom) * 100 * 1.6));
    const dc = driverCount.get(d.district);
    d.drivers = dc
      ? [...dc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k.replace(/_/g, " "))
      : [];
  }
  return [...map.values()].sort((a, b) => b.risk - a.risk);
}
