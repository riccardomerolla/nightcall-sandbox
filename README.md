# Advisor Workbench

A Perplexity-Finance-style workbench for bank financial advisors serving
retail customers: import a customer's portfolio and MiFID profile, analyze
allocation and suitability, and produce a rebalancing proposal the advisor
can review with the customer.

Built by [Nightcall](https://github.com/riccardomerolla/nightcall) from
issues labeled `factory:ready`.

## Stack and conventions

- **Client-only web app**: Next.js (App Router) static export
  (`output: "export"` — see `next.config.ts`). There is NO server runtime:
  no API routes, no server actions, no Node APIs (`fs`, `path`) in `app/`
  code. Everything runs in the browser or at build time.
- **Deployment**: merged PRs deploy to GitHub Pages automatically
  (`.github/workflows/deploy.yml`); PRs run gate + build as checks
  (`ci.yml`). The site is served under the `/nightcall-sandbox` base path
  — never hardcode absolute paths; prefix fetches with
  `process.env.NEXT_PUBLIC_BASE_PATH ?? ""`.
- **Effect-TS** (`effect` v4 beta) for all domain and application logic in
  `lib/`: schemas at every data boundary (`effect/Schema`), typed errors
  (`Schema.TaggedErrorClass`), pure functions wherever possible. No `any`,
  no unchecked casts, no thrown domain errors. `lib/` code must be
  browser-safe (no Node APIs).
- React components stay thin; they call into `lib/` and render. Use
  Client Components (`"use client"`) where the page loads data or
  interacts; sample fixtures are published under `public/fixtures/` and
  fetched at runtime.
- Tests in `test/**/*.test.ts` with vitest, deterministic, no network
  (tests may read `fixtures/` from disk — test code is not shipped).
  Every exported `lib/` function has tests.
- Money is EUR throughout v1. Percentages are numbers 0–100.

## Sample data

- `fixtures/portfolio-mario-rossi.csv` — a customer portfolio: one
  position per row (`isin,name,assetClass,quantity,priceEur,currency`).
  Asset classes: `equity`, `government_bond`, `corporate_bond`,
  `commodity`, `cash`.
- `fixtures/mifid-mario-rossi.json` — the customer's MiFID suitability
  profile: risk profile on a five-step scale, horizon, knowledge,
  objectives, constraints.

## Commands

```bash
npm install
npm run dev        # local app
npm run gate       # typecheck + tests — must be green before any merge
```
