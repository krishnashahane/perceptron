import type { Dataset, Beneficiary, Payment, Inspection, Approval, BankAccount, Contractor, Official } from "@/lib/types";

// Minimal denormalized ingestion schema — one row per beneficiary-payment.
export const REQUIRED = [
  "beneficiary_id",
  "district",
  "bank_account",
  "contractor_id",
  "amount",
  "payment_ts",
] as const;

export const SAMPLE_HEADER =
  "beneficiary_id,name,phone,district,lat,lng,bank_account,contractor_id,address_cluster,amount,payment_ts,inspection_ts,doc_hash,approval_latency_min";

const ANCHOR: [number, number] = [19.0, 75.0];

function parseTs(v: string): number {
  if (!v) return Date.now();
  const n = Number(v);
  if (!Number.isNaN(n) && n > 1e11) return n; // epoch ms
  const d = Date.parse(v);
  return Number.isNaN(d) ? Date.now() : d;
}

export interface IngestResult {
  data: Dataset | null;
  rows: number;
  errors: string[];
}

// Defensive CSV parser (no external dep). Handles quoted fields + commas.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => sanitizeCell(s));
}

// Neutralize CSV/spreadsheet formula-injection: any cell starting with = + - @
// or a control char is prefixed with a single quote so Excel/Sheets treats it as
// literal text, never an executable formula. Also strips control characters.
export function sanitizeCell(raw: string): string {
  // Strip ASCII control characters, then trim.
  let s = raw.replace(/[\x00-\x1F\x7F]/g, "").trim();
  // Prefix a single quote if it begins with a formula trigger (=, +, -, @).
  if (s && /^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

export function parseCsvToDataset(text: string, maxRows = 5000): IngestResult {
  const errors: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  if (lines.length < 2) return { data: null, rows: 0, errors: ["Empty or header-only CSV."] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  for (const req of REQUIRED) if (idx(req) === -1) errors.push(`Missing required column: ${req}`);
  if (errors.length) return { data: null, rows: 0, errors };

  if (lines.length - 1 > maxRows) errors.push(`Truncated to first ${maxRows} rows (received ${lines.length - 1}).`);

  const beneficiaries: Beneficiary[] = [];
  const payments: Payment[] = [];
  const inspections: Inspection[] = [];
  const approvals: Approval[] = [];
  const bankSet = new Map<string, BankAccount>();
  const conSet = new Map<string, Contractor>();
  const officials: Official[] = [{ id: "O-EXT", name: "External Authority", role: "Sanctioning Authority" }];
  const seen = new Set<string>();

  const rows = Math.min(lines.length - 1, maxRows);
  for (let i = 1; i <= rows; i++) {
    const cols = splitCsvLine(lines[i]);
    const get = (k: string) => (idx(k) >= 0 ? cols[idx(k)] ?? "" : "");
    const id = get("beneficiary_id");
    if (!id) { if (errors.length < 12) errors.push(`Row ${i}: missing beneficiary_id — skipped`); continue; }
    if (seen.has(id)) { if (errors.length < 12) errors.push(`Row ${i}: duplicate beneficiary_id ${id} — skipped`); continue; }
    seen.add(id);

    const district = get("district") || "Unknown";
    const bank = get("bank_account") || `BANK-${id}`;
    const con = get("contractor_id") || "C-EXT";
    const amountRaw = Number(get("amount"));
    if (!Number.isFinite(amountRaw) || amountRaw < 0) {
      if (errors.length < 12) errors.push(`Row ${i}: invalid amount — skipped`);
      continue;
    }
    const amount = Math.round(amountRaw);
    const ts = parseTs(get("payment_ts"));
    const lat = Number(get("lat")) || ANCHOR[0];
    const lng = Number(get("lng")) || ANCHOR[1];
    const cluster = get("address_cluster") || `${district}-${id.slice(-2)}`;
    const phone = get("phone") || `0000000${id.slice(-3)}`;
    const doc = get("doc_hash") || `DOC-${id}`;
    const latency = Math.round(Number(get("approval_latency_min")) || 999);

    beneficiaries.push({ id, name: get("name") || id, phone, addressCluster: cluster, district, lat, lng, bankAccountId: bank, contractorId: con });
    payments.push({ id: `P-${id}`, beneficiaryId: id, amount, ts, approvedById: "O-EXT", milestone: "completion", documentHash: doc });
    const inspTsRaw = get("inspection_ts");
    if (inspTsRaw) inspections.push({ id: `I-${id}`, beneficiaryId: id, ts: parseTs(inspTsRaw), passed: true, officerId: "O-EXT" });
    approvals.push({ id: `A-${id}`, beneficiaryId: id, officialId: "O-EXT", ts: ts - latency * 60000, latencyMin: latency });

    if (!bankSet.has(bank)) bankSet.set(bank, { id: bank, ifsc: "EXT", holder: get("name") || id });
    if (!conSet.has(con)) conSet.set(con, { id: con, name: con, district });
  }

  if (beneficiaries.length === 0) return { data: null, rows: 0, errors: [...errors, "No valid rows parsed."] };

  const totalDisbursed = payments.reduce((s, p) => s + p.amount, 0);
  const districts = [...new Set(beneficiaries.map((b) => b.district))];
  const data: Dataset = {
    banks: [...bankSet.values()],
    contractors: [...conSet.values()],
    officials,
    beneficiaries,
    payments,
    inspections,
    approvals,
    truth: {},
    meta: { totalDisbursed, districts },
  };
  return { data, rows: beneficiaries.length, errors };
}
