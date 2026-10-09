# Perceptron

Perceptron is a **government fund-integrity intelligence demo** built for Smart India Hackathon 2026. It analyzes welfare-scheme records, detects suspicious patterns, reconstructs relationship networks, and gives investigators an explainable, ranked review queue.

It is designed for **investigative support, not automatic enforcement**.

## What it does

Perceptron combines three layers:

1. **Deterministic rules** — detects signals such as shared bank accounts, shared phones, duplicate documents, geographic clustering, contractor concentration, burst payments, payment-before-inspection, and unusually fast approvals.
2. **Statistical anomaly scoring** — produces an independent anomaly score from payment amount, approval latency, and burst behavior.
3. **Graph analysis** — reconstructs multi-hop clusters from shared entities so related beneficiaries can be reviewed together.

Each flagged case contains the signals contributing to its score, relevant entities, financial exposure, severity, and linked records.

## How it works

    Scheme records
          ↓
    validation / normalization
          ↓
    risk-signal extraction
          ↓
    rule-based score + anomaly score
          ↓
    case ranking
          ↓
    relationship graph
          ↓
    investigator review queue
          ↓
    audit / decision log

The bundled demo dataset is generated deterministically with seed `42`, so the same code produces the same synthetic universe.

The generator injects known anomaly labels for evaluation. The detection engine does not use those labels while scoring cases; they are reserved for evaluation metrics.

## Main routes

- `/` — login
- `/command` — operations console, KPIs, live detection feed, district risk, and high-risk cases
- `/graph` — relationship/collusion graph
- `/cases/[id]` — case file, evidence, risk dimensions, actions, and explainability copilot
- `/simulate` — disruption/what-if analysis
- `/ingest` — admin CSV ingestion and detection
- `/audit` — admin audit trail

## Stack

- Next.js 16.3.8
- React 19
- TypeScript
- Tailwind CSS v4
- Leaflet / React Leaflet
- Zod
- Web Crypto
- Optional Gemini API for copilot responses

The application is intentionally stateless at runtime. The analytical dataset is generated in memory, and uploaded CSV data is processed in memory rather than persisted.

## Requirements

- Node.js 20.9+
- npm 10+

Next.js 16 requires Node.js 20.9 or newer. citeturn968351search2

## Run locally

    npm install
    npm run dev

Open `http://localhost:3000`.

Development demo credentials:

| Role | Username | Password |
|---|---|---|
| Analyst | `analyst` | `perceptron-analyst` |
| Investigator | `investigator` | `perceptron-invest` |
| Admin | `admin` | `perceptron-admin` |

## Production configuration

Copy `.env.example` to `.env.local` and configure:

    PERCEPTRON_SECRET=<long-random-secret>
    PERCEPTRON_PW_ANALYST=<strong-password>
    PERCEPTRON_PW_INVESTIGATOR=<strong-password>
    PERCEPTRON_PW_ADMIN=<strong-password>

Optional AI copilot:

    GEMINI_API_KEY=<key>
    GEMINI_MODEL=gemini-2.5-flash

When `NODE_ENV=production`, the application does not fall back to the development signing secret or built-in demo passwords.

## Authentication and security

Authentication uses an HMAC-SHA-256 signed, HttpOnly session cookie.

The application also applies:

- Zod validation on API inputs
- bounded per-IP rate limiting
- CSP with per-request nonces
- HSTS in production
- `X-Content-Type-Options` and `X-Frame-Options`
- strict referrer and permissions policies
- CSV formula-injection neutralization
- finite-number validation for imported payment amounts
- role-based authorization for protected actions
- server-side session verification
- no browser `localStorage` session token

## CSV ingestion

The `/ingest` route requires these fields:

    beneficiary_id
    district
    bank_account
    contractor_id
    amount
    payment_ts

Optional fields include `name`, `phone`, `lat`, `lng`, `address_cluster`, `inspection_ts`, `doc_hash`, and `approval_latency_min`.

Uploads are capped at 4 MB and 5,000 rows. Data is analyzed in memory.

Invalid or non-finite payment amounts are rejected rather than silently converted to zero.

## Copilot

Without `GEMINI_API_KEY`, the application uses the deterministic offline explanation engine.

With Gemini configured, the model receives the case facts and question and is instructed to answer from those facts only. External-model failure falls back to the deterministic engine.

AI output is advisory and cannot perform investigative actions.

## Evaluation

The application reports precision, recall, F1, true positives, false positives, and false negatives against the synthetic ground truth.

These numbers describe the bundled synthetic dataset. They are not evidence of production fraud-detection accuracy.

The threshold tuner lets you explore the precision/recall operating point.

## Audit trail

Operator actions are stored in an in-memory SHA-256 hash chain.

The audit page recomputes the retained chain and reports whether it is internally consistent.

This is tamper-evident within the running process, not a durable WORM archive. Restarting the application clears the in-memory audit log.

## Development checks

    npm run lint
    npm run typecheck
    npm run test:unit
    npm run test:e2e
    npm run check

GitHub Actions also runs lint, typecheck, unit tests, and a production build on pushes and pull requests.

## Project structure

    perceptron/
    ├── src/
    │   ├── app/                 # Next.js routes and API handlers
    │   ├── components/          # UI components
    │   └── lib/                 # detection engine, auth, ingestion, data
    ├── tests/
    │   ├── e2e/
    │   └── ingest.test.ts
    ├── public/
    ├── .env.example
    ├── .github/workflows/ci.yml
    ├── next.config.ts
    ├── proxy.ts
    └── package.json

## Limitations

- Demo data is synthetic.
- There is no persistent database.
- Rate limiting and the audit log are per-process and reset on restart.
- The anomaly score is statistical, not a trained fraud classifier.
- Uploaded data is analyzed in memory and is not retained.
- Findings are investigative leads and require human verification.

## License

MIT
