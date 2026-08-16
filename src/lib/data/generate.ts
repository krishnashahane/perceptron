import type {
  AnomalyLabel,
  Approval,
  BankAccount,
  Beneficiary,
  Contractor,
  Dataset,
  Inspection,
  Official,
  Payment,
} from "@/lib/types";

// Deterministic PRNG so server + client + eval agree on the same universe.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DISTRICTS = [
  "Solapur",
  "Pune",
  "Nashik",
  "Nagpur",
  "Aurangabad",
  "Kolhapur",
  "Latur",
  "Amravati",
];

// District geo anchors (approx lat/lng, Maharashtra) for the map/twin.
const ANCHORS: Record<string, [number, number]> = {
  Solapur: [17.6599, 75.9064],
  Pune: [18.5204, 73.8567],
  Nashik: [19.9975, 73.7898],
  Nagpur: [21.1458, 79.0882],
  Aurangabad: [19.8762, 75.3433],
  Kolhapur: [16.705, 74.2433],
  Latur: [18.4088, 76.5604],
  Amravati: [20.9374, 77.7796],
};

const FIRST = ["Ravi", "Sunita", "Amit", "Priya", "Vijay", "Anita", "Suresh", "Meena", "Rahul", "Kavita", "Deepak", "Sneha", "Ganesh", "Pooja", "Nitin", "Rekha"];
const LAST = ["Patil", "Shinde", "Jadhav", "Kulkarni", "More", "Pawar", "Deshmukh", "Gaikwad", "Chavan", "Kadam", "Sawant", "Joshi"];

const AMOUNT = 80000; // fixed sanctioned unit (housing scheme installment)
const JUNE = Date.UTC(2026, 5, 1);

export interface GenConfig {
  seed?: number;
  beneficiaries?: number;
}

export function generateDataset(cfg: GenConfig = {}): Dataset {
  const rng = mulberry32(cfg.seed ?? 42);
  const N = cfg.beneficiaries ?? 1500;
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  const pad = (n: number, w = 4) => n.toString().padStart(w, "0");

  const banks: BankAccount[] = [];
  const contractors: Contractor[] = [];
  const officials: Official[] = [];
  const beneficiaries: Beneficiary[] = [];
  const payments: Payment[] = [];
  const inspections: Inspection[] = [];
  const approvals: Approval[] = [];
  const truth: Record<string, AnomalyLabel[]> = {};

  const addTruth = (id: string, l: AnomalyLabel) => {
    (truth[id] ||= []).push(l);
  };

  // Officials & contractors pool.
  for (let i = 0; i < 24; i++)
    officials.push({ id: `O-${pad(i, 3)}`, name: `${pick(FIRST)} ${pick(LAST)}`, role: pick(["Block Officer", "Verifier", "Sanctioning Authority"]) });
  for (let i = 0; i < 40; i++)
    contractors.push({ id: `C-${pad(i, 3)}`, name: `${pick(LAST)} Constructions`, district: pick(DISTRICTS) });

  // One dedicated "clean" bank per beneficiary by default.
  const mkBank = (i: number, holder: string): BankAccount => ({
    id: `BANK-${pad(i)}`,
    ifsc: `SBIN0${pad(1000 + Math.floor(rng() * 8999), 4)}`,
    holder,
  });

  // Colluding rings: shared bank + contractor + burst timing + geo cluster.
  const ringCount = 14;
  const ringBanks: BankAccount[] = [];
  const ringContractors: Contractor[] = [];
  for (let r = 0; r < ringCount; r++) {
    const b = mkBank(9000 + r, `Ring Holder ${r}`);
    banks.push(b);
    ringBanks.push(b);
    ringContractors.push(contractors[r]); // reuse first contractors as concentration hubs
  }

  let bankSeq = 0;
  let paySeq = 0;
  let inspSeq = 0;
  let apprSeq = 0;

  for (let i = 0; i < N; i++) {
    const id = `B-${pad(i)}`;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const district = pick(DISTRICTS);
    const [alat, alng] = ANCHORS[district];
    const roll = rng();

    let bank: BankAccount;
    let contractorId: string;
    let phone = `9${Math.floor(700000000 + rng() * 99999999)}`;
    let addressCluster = `${district}-${Math.floor(rng() * 400)}`;
    let lat = alat + (rng() - 0.5) * 0.25;
    let lng = alng + (rng() - 0.5) * 0.25;
    let ts = JUNE + Math.floor(rng() * 25 * 864e5);
    const inRing = roll < 0.09; // ~9% belong to fraud rings
    // Tiered footprint: not every fraudster is sloppy — some leave faint traces
    // (recall < 1); some honest citizens coincidentally cluster (precision < 1).
    const tier = rng(); // strong <0.5, medium <0.8, weak otherwise
    let strong = false;

    if (inRing) {
      const r = i % ringCount;
      bank = ringBanks[r];
      contractorId = ringContractors[r].id;
      if (tier < 0.5) {
        // STRONG ring: full multimodal footprint.
        strong = true;
        addressCluster = `RING-${r}`;
        lat = alat + r * 0.001 + (rng() - 0.5) * 0.0008;
        lng = alng + r * 0.001 + (rng() - 0.5) * 0.0008;
        ts = JUNE + r * 36e5 + Math.floor(rng() * 6) * 60000; // burst window
        addTruth(id, "shared_bank");
        addTruth(id, "contractor_concentration");
        addTruth(id, "geo_cluster");
        addTruth(id, "burst_payments");
        if (rng() < 0.6) { phone = `98${pad(760000 + r, 6)}`; addTruth(id, "shared_phone"); }
      } else if (tier < 0.8) {
        // MEDIUM ring: shared bank + geo, spread timing (no burst/concentration signal).
        addressCluster = `RING-${r}`;
        lat = alat + r * 0.001 + (rng() - 0.5) * 0.0008;
        lng = alng + r * 0.001 + (rng() - 0.5) * 0.0008;
        addTruth(id, "shared_bank");
        addTruth(id, "geo_cluster");
        if (rng() < 0.4) { phone = `98${pad(760000 + r, 6)}`; addTruth(id, "shared_phone"); }
      } else {
        // WEAK ring: only a faint identity trace — designed to slip below threshold.
        contractorId = pick(contractors).id; // break contractor link
        bank = mkBank(bankSeq++, name); // own bank
        banks.push(bank);
        phone = `98${pad(760000 + r, 6)}`;
        addTruth(id, "shared_phone");
      }
    } else {
      // Honest citizen. ~3% coincidentally share a joint-family account AND live in a
      // dense urban block — an innocent pattern that superficially resembles a ring.
      if (rng() < 0.03) {
        const fam = i % 30;
        bank = ringBanks[fam % ringBanks.length];
        addressCluster = `DENSE-${district}-${fam % 6}`;
      } else {
        bank = mkBank(bankSeq++, name);
        banks.push(bank);
      }
      contractorId = pick(contractors).id;
    }

    beneficiaries.push({ id, name, phone, addressCluster, district, lat, lng, bankAccountId: bank.id, contractorId });

    // Inspection (strong rings: often missing or recorded after payment).
    const inspTs = ts + (strong && rng() < 0.7 ? 3 * 864e5 : -2 * 864e5);
    const hasInspection = !(strong && rng() < 0.35);
    if (hasInspection) {
      inspections.push({ id: `I-${pad(inspSeq++)}`, beneficiaryId: id, ts: inspTs, passed: !strong || rng() > 0.5, officerId: pick(officials).id });
    }

    // Payment.
    const docHash = strong && rng() < 0.6 ? `DOC-DUP-${i % ringCount}` : `DOC-${pad(i, 6)}`;
    if (docHash.startsWith("DOC-DUP")) addTruth(id, "duplicate_document");
    const paidBeforeInspection = strong && hasInspection && inspTs > ts;
    if (paidBeforeInspection) addTruth(id, "payment_before_inspection");
    payments.push({
      id: `P-${pad(paySeq++)}`,
      beneficiaryId: id,
      amount: AMOUNT + (strong ? 0 : Math.floor((rng() - 0.5) * 4000)),
      ts,
      approvedById: strong ? officials[i % 3].id : pick(officials).id,
      milestone: "completion",
      documentHash: docHash,
    });

    // Approval latency: strong rings pushed through suspiciously fast.
    const latencyMin = strong ? Math.floor(1 + rng() * 8) : Math.floor(60 + rng() * 4000);
    if (strong && latencyMin < 15) addTruth(id, "fast_approval");
    approvals.push({ id: `A-${pad(apprSeq++)}`, beneficiaryId: id, officialId: strong ? officials[i % 3].id : pick(officials).id, ts: ts - latencyMin * 60000, latencyMin });
  }

  const totalDisbursed = payments.reduce((s, p) => s + p.amount, 0);
  return {
    banks,
    contractors,
    officials,
    beneficiaries,
    payments,
    inspections,
    approvals,
    truth,
    meta: { totalDisbursed, districts: DISTRICTS },
  };
}
