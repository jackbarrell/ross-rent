# RossRent PoC — STR Acquisition Analysis Dashboard

Proof-of-concept web app for evaluating residential properties as potential short-term rental investments.

## What this PoC demonstrates

1. Pull for-sale listings (mock MLS-style data)
2. Pull STR market comparables (mock Airbnb/Vrbo-style data)
3. Combine datasets
4. Run transparent investment analysis
5. Show output in a clean dashboard with an AI summary panel

## Repo structure

- `frontend/` Next.js dashboard
- `backend/` Express API + analysis engine
- `data/` demo fixture datasets
- `docs/` architecture, assumptions, integration notes, next steps

## Tech stack

- Frontend: Next.js + TypeScript
- Backend: Node.js Express + TypeScript
- Database: SQLite (`better-sqlite3`)

## Quick start

### 1) Install dependencies

From repository root:

```bash
npm run install:all
```

### 2) Configure environment

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.local.example frontend/.env.local
```

### 3) Run backend

```bash
npm run dev:backend
```

Backend URL: http://localhost:4000

### 4) Run frontend

```bash
npm run dev:frontend
```

Frontend URL: http://localhost:3000

## Demo flow

1. Open dashboard at `localhost:3000`
2. Pick a location (Austin, Nashville, Scottsdale)
3. Browse for-sale properties
4. Open a property detail page
5. Review market metrics, financial analysis, comps, and AI summary

## Domain models

- `PropertyListing`
- `RentalComparable`
- `MarketMetrics`
- `InvestmentAnalysis`
- `AnalysisAssumptions`

## Analysis formulas (explicit)

- `monthlyRevenue = ADR × occupancyRate × daysInMonth`
- `annualRevenue = monthlyRevenue × 12`
- `operatingCost = variableCosts + fixedCosts`
- `NOI = annualRevenue − operatingCost`
- `yieldProxy = NOI ÷ purchasePrice`

Attractiveness score is a weighted heuristic using yield, occupancy, comp depth, and risk penalty.

## Endpoints

- `GET /health`
- `GET /api/locations`
- `GET /api/properties?location=Austin,TX`
- `GET /api/properties/:id`
- `GET /api/analysis/:propertyId`

## Real vs mocked in this PoC

### Real

- Running full frontend-backend workflow
- SQLite persistence and seeded datasets
- End-to-end analysis calculations
- Dashboard rendering with supporting comparables

### Mocked / simulated

- MLS data feed (fixture-backed)
- Airbnb/Vrbo comparables (fixture-backed)
- Market seasonality/risk metadata (fixture-backed)
- AI summary defaults to heuristic mode unless `OPENAI_API_KEY` is configured

## Where real integrations slot in

Replace provider stubs:

- `backend/src/providers/liveProviders.ts`
  - `LiveListingProvider`
  - `LiveShortTermRentalProvider`

No frontend changes required if provider output schema is preserved.

## Biggest technical risks

1. **Data quality drift**: poor comps or stale listing feeds can skew yield estimates.
2. **Regulatory variance**: permit/zoning rules change fast and are highly local.
3. **Provider dependency risk**: API limits, pricing, and schema changes can break ingestion.
4. **Model simplification risk**: current scoring is screening-oriented, not full underwriting.

## Fastest route to production

1. Swap mock providers for live listings + STR market APIs.
2. Add debt financing model and scenario analysis.
3. Add regulatory compliance checks by address.
4. Add observability, retries, and data freshness monitoring.
5. Add auth + saved deal pipelines.

## Notes

This PoC intentionally avoids auth, billing, hardening, and deep operational tooling to maximize speed and demoability.
