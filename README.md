# Perceptron

Most fraud in government welfare schemes doesn't look like fraud on any single record. A payment is valid. A beneficiary is real. An approval is signed. The leakage lives in the *relationships* — ten "different" people sharing one bank account, a contractor whose entire roster of beneficiaries clears approval in under two minutes, a cluster of addresses that only exists on paper.

Perceptron is a command console that surfaces those patterns before the money is gone. It ingests scheme records, scores every case across six independent risk dimensions, reconstructs the collusion networks hiding underneath, and hands an investigator a ranked, explainable queue instead of a spreadsheet.

Live: https://perceptron-ai-tau.vercel.app

Built for Smart India Hackathon 2026 (Team Perceptron).

---

## What it does

- **Detects, then explains.** Every flag comes with the specific signals that raised it — duplicate identity, shared payment endpoint, abnormal approval latency, geographic clustering, process violations, document reuse. Nothing is a black box.
- **Finds rings, not just rows.** A union-find pass over shared banks, phones and documents rebuilds the actual networks so a coordinated fraud shows up as one case, not forty unrelated ones.
- **Ranks by money at risk.** Investigators work the highest-exposure cases first, with a live predictive view of which districts are trending.
- **Keeps a human in the loop.** The system recommends; it never auto-acts. Every investigate / escalate / resolve is written to a hash-chained, tamper-evident audit log.
- **Runs in real time.** A server-authoritative detection stream feeds the console as cases surface, with an offline-safe fallback.

## How the detection works

The engine is deliberately not a single model you have to trust on faith. It combines:

1. A **rules layer** — deterministic checks for the six risk dimensions, each contributing a weighted, inspectable score.
2. An **unsupervised model layer** — z-score and isolation-style anomaly detection that flags outliers the rules didn't anticipate. Both scores are shown side by side.
3. A **graph layer** — community detection over shared attributes to expose coordinated behaviour.

To keep the numbers honest, the platform runs on a deterministic synthetic dataset (seed 42, ~1,500 beneficiaries) with a *known* set of injected fraud rings across strong, medium and weak tiers, plus benign coincidences designed to bait false positives. The engine rediscovers them independently, and the console reports its real measured performance against that ground truth:

| Metric | Score |
|---|---|
| Precision | 0.94 |
| Recall | 0.81 |
| F1 | 0.87 |

A live threshold tuner lets you drag the operating point and watch precision, recall and the PR trade-off update in place.

## Tour

- `/` — access console (login)
- `/command` — KPIs, live detection feed, geospatial district-risk map, highest-risk cases, predictive district risk
- `/graph` — the collusion network
- `/cases/[id]` — full case file: risk gauge, dimension radar, evidence ledger, role-gated actions, an explainability copilot
- `/simulate` — what-if analysis: disrupt a bank or contractor hub and see the exposure it would have prevented
- `/ingest` — upload your own CSV and run the same engine on it (admin)
- `/audit` — the tamper-evident decision log (admin)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Leaflet · Zod · Web Crypto.

No database — the analytical dataset is generated deterministically at runtime, which keeps the demo reproducible and the deployment stateless. Uploaded CSVs are processed in memory only.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Demo accounts (roles map to different permissions):

| Role | Username | Password |
|---|---|---|
| Analyst | `analyst` | `perceptron-analyst` |
| Investigator | `investigator` | `perceptron-invest` |
| Admin | `admin` | `perceptron-admin` |

### Environment

Copy `.env.example` to `.env.local`. Everything runs without configuration; two optional variables unlock more:

- `PERCEPTRON_SECRET` — HMAC key for signed session cookies (set a long random string in production).
- `GEMINI_API_KEY` — enables AI-synthesised copilot answers. Without it the copilot still works fully via the deterministic, evidence-grounded engine.

### Scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run test:unit    # ingestion + detection unit tests
npm run test:e2e     # Playwright end-to-end
```

## Security

Authentication is a stateless, HMAC-SHA256 signed httpOnly cookie verified with Web Crypto, so the same code runs in route handlers and at the edge. Requests are gated by role (analyst / investigator / admin), validated with Zod, and rate-limited per IP. A nonce-based Content-Security-Policy, HSTS and the usual hardening headers are applied to every response. Uploaded CSVs are sanitised against formula injection before parsing.

## Notes on the design

The interface is intentionally built like an operations console rather than a dashboard — dense, dark, telemetry-forward — because that is the environment this kind of work actually happens in. It ships with a daylight mode for projectors and well-lit rooms.

---

**Author:** Krishna Shahane
