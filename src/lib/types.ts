// PERCEPTRON domain model — government scheme integrity intelligence.

export type RiskDim =
  | "identity"
  | "payment"
  | "relationship"
  | "geographic"
  | "process"
  | "document";

export type Severity = "critical" | "high" | "medium" | "low";

export interface BankAccount {
  id: string; // BANK-xxxx
  ifsc: string;
  holder: string;
}

export interface Contractor {
  id: string; // C-xxx
  name: string;
  district: string;
}

export interface Official {
  id: string; // O-xxx
  name: string;
  role: string;
}

export interface Beneficiary {
  id: string; // B-xxxx
  name: string;
  phone: string;
  addressCluster: string; // synthetic geo cluster key
  district: string;
  lat: number;
  lng: number;
  bankAccountId: string;
  contractorId: string;
}

export interface Payment {
  id: string; // P-xxxx
  beneficiaryId: string;
  amount: number;
  ts: number; // epoch ms
  approvedById: string;
  milestone: "sanction" | "inspection" | "completion";
  documentHash: string;
}

export interface Inspection {
  id: string;
  beneficiaryId: string;
  ts: number;
  passed: boolean;
  officerId: string;
}

export interface Approval {
  id: string;
  beneficiaryId: string;
  officialId: string;
  ts: number;
  latencyMin: number; // time from request to approval
}

// Ground-truth anomaly labels injected during generation (for eval only).
export type AnomalyLabel =
  | "shared_bank"
  | "shared_phone"
  | "geo_cluster"
  | "contractor_concentration"
  | "burst_payments"
  | "payment_before_inspection"
  | "duplicate_document"
  | "fast_approval";

export interface Dataset {
  banks: BankAccount[];
  contractors: Contractor[];
  officials: Official[];
  beneficiaries: Beneficiary[];
  payments: Payment[];
  inspections: Inspection[];
  approvals: Approval[];
  // beneficiaryId -> set of true labels
  truth: Record<string, AnomalyLabel[]>;
  meta: { totalDisbursed: number; districts: string[] };
}

export interface Evidence {
  dim: RiskDim;
  label: AnomalyLabel | "clean";
  weight: number; // 0..100 contribution
  detail: string;
  refs: string[]; // related entity ids
}

export interface Case {
  id: string; // CASE-xxxx
  beneficiaryId: string;
  score: number; // 0..100 rule-based integrity risk
  modelScore: number; // 0..100 unsupervised statistical anomaly (independent signal)
  severity: Severity;
  dims: Record<RiskDim, number>;
  evidence: Evidence[];
  amountAtRisk: number;
  clusterId: string | null; // multi-hop community id
  district: string;
  detectedLabels: AnomalyLabel[];
}

export interface Community {
  id: string;
  members: number;
  exposure: number;
  districts: string[];
  caseIds: string[];
}

export interface Hub {
  id: string;
  kind: "bank" | "contractor";
  linked: number;
  exposure: number;
  caseIds: string[];
}

export interface GraphNode {
  id: string;
  kind: "beneficiary" | "bank" | "contractor" | "official";
  label: string;
  risk: number;
  x: number;
  y: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  kind: "bank" | "contractor" | "approval" | "phone";
}
export interface RiskGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DistrictRisk {
  district: string;
  risk: number; // 0..100 predictive
  cases: number;
  amountAtRisk: number;
  drivers: string[];
}

export interface EngineResult {
  cases: Case[];
  graph: RiskGraph;
  districts: DistrictRisk[];
  communities: Community[];
  hubs: Hub[];
  labeled: { s: number; a: 0 | 1 }[]; // per-beneficiary {rawScore, actualFraud} for live threshold tuning
  kpis: {
    totalDisbursed: number;
    beneficiaries: number;
    flagged: number;
    amountAtRisk: number;
    critical: number;
    high: number;
  };
  eval: { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number };
}

export type Role = "analyst" | "investigator" | "admin";
