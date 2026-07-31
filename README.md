# Advisor Workbench

A Perplexity-Finance-style workbench for bank financial advisors serving
retail customers: import a customer's portfolio and MiFID profile, analyze
allocation and suitability, and produce a rebalancing proposal the advisor
can review with the customer.

Built by [Nightcall](https://github.com/riccardomerolla/nightcall) from
issues labeled `factory:ready`.

## Stack and conventions

- **Next.js (App Router) + React**, TypeScript strict. Pages and routes in
  `app/`.
- **Effect-TS** (`effect` v4 beta) for all domain and application logic in
  `lib/`: schemas at every data boundary (`effect/Schema`), typed errors
  (`Schema.TaggedErrorClass`), pure functions wherever possible. No `any`,
  no unchecked casts, no thrown domain errors.
- React components stay thin; they call into `lib/` and render. Server
  Components by default; Client Components only where interaction needs
  them.
- Tests in `test/**/*.test.ts` with vitest, deterministic, no network.
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
