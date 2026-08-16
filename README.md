# PRISM — Public Resource & Integrity Surveillance Matrix

> Detect fraud, collusion and process violations across government schemes **before** public money is lost — with explainable, graph-driven integrity intelligence. Software-only. Human-in-the-loop. Offline-capable.

**Team Perceptron · SIH 2026.** Built on Next.js 16 (App Router).

## The idea
Auditors ask *"were the records tampered?"* PRISM asks *"is something wrong right now, and can I prove why?"* It ingests scheme records (beneficiaries, payments, contractors, inspections, approvals, documents, bank accounts, geolocation), rediscovers hidden relationships, and scores each entity across six integrity dimensions — **identity, payment, relationship, geographic, process, document** — with a fully explainable evidence ledger.

## What's inside
- **Detection engine** (`src/lib/engine.ts`) — rules + shared-attribute graph + statistical anomalies. Independently rediscovers injected fraud, then reports honest **precision / recall / F1** against ground truth (~0.94 / 0.81 / 0.87 on the seeded 1,500-record universe).
- **Collusion network graph** — beneficiaries ⇄ banks ⇄ contractors as one graph; rings that look clean row-by-row light up as shared hubs.
- **Explainable cases** — score gauge, six-axis risk radar, weighted evidence, linked beneficiaries. No single indicator condemns a record; the *combination* does.
- **Integrity Copilot** — grounded strictly in detected evidence (never invents facts). Uses Gemini when `GEMINI_API_KEY` is set, else a deterministic offline explainer.
- **Human-in-the-loop** — PRISM ranks and explains; an authorized officer decides. Every action is written to an append-only audit trail.

## Security (hardened)
- Nonce-based **Content-Security-Policy** (`strict-dynamic`), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP.
- **HMAC-SHA256 signed sessions** (Web Crypto, edge-verified), httpOnly · secure · SameSite=strict · 8h TTL.
- **RBAC** (analyst / investigator / admin) enforced server-side on every mutating route.
- **Zod** input validation, per-IP **rate limiting** on all APIs, constant-time credential compare.
- Identity fields **minimized** (DPDP-aligned) in the UI. `0` npm vulnerabilities.

## Run locally
```bash
npm install
cp .env.example .env.local   # set PRISM_SECRET (GEMINI_API_KEY optional)
npm run dev
```
Demo logins (click to autofill on the terminal): `analyst / prism-analyst`, `investigator / prism-invest`, `admin / prism-admin`.

## Architecture
`records → shared-attribute indexing → rules + graph + anomaly detectors → six-dim scoring → cases + collusion graph + predictive district risk → explainable copilot → human decision → audit`

Data is deterministic and synthetic (seed 42) with **labeled** injected anomalies, so accuracy is measurable — not asserted.
