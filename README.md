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

For live API mode (real data), set `USE_MOCK_DATA=false` and add your API keys:

```bash
USE_MOCK_DATA=false
RENTCAST_API_KEY=your_key      # Property listings
MASHVISOR_API_KEY=your_key     # STR analytics
FRED_API_KEY=your_key          # Economic data
WALKSCORE_API_KEY=your_key     # Walkability scores
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

- `monthlyRevenue[i] = ADR × seasonalityFactor[i] × occupancy × seasonalityFactor[i] × daysInMonth` (per-month with seasonality curves)
- `annualRevenue = Σ monthlyRevenue[0..11]`
- `operatingCost = variableCosts + fixedCosts`
- `NOI = annualRevenue − operatingCost`
- `yieldProxy = NOI ÷ totalBasis`
- `IRR = Newton-Raphson solver on 5-year cashflows including terminal sale`

Attractiveness score is a weighted heuristic using yield, occupancy, comp depth, and risk penalty.

## Endpoints

- `GET /health`
- `GET /api/locations`
- `GET /api/properties?location=Austin,TX`
- `GET /api/properties/:id`
- `GET /api/analysis/:propertyId` — STR investment analysis
- `POST /api/analysis/:propertyId` — analysis with custom assumptions
- `GET /api/ranking?location=Austin,TX` — ranked properties by score
- `GET /api/macro/:locationKey` — macro/economic data
- `GET /api/cost-library` — renovation cost library
- `GET /api/renovation/:propertyId` — auto renovation estimate
- `POST /api/renovation/:propertyId` — custom renovation items
- `GET /api/valuation/:propertyId?renovationCost=N` — post-reno valuation
- `GET /api/financial-model/:propertyId?renovationCost=N` — 5-year model
- `GET /api/memo/:propertyId` — investment memo
- `GET /api/operations/:propertyId` — booking operations snapshot
- `GET /api/accounting` — company-level P&L
- `GET /api/accounting/:propertyId` — property-level P&L
- `GET /api/forecast-vs-actual/:propertyId` — forecast vs actual comparison
- `GET /api/portfolio` — portfolio summary

## Real vs mocked in this PoC

### Real (with `USE_MOCK_DATA=false`)

- **Property listings** from RentCast API (any US market)
- **STR rental comps** from Mashvisor API (Airbnb analytics)
- **Macro data** from FRED (unemployment, home prices) + WalkScore
- Running full frontend-backend workflow
- End-to-end analysis calculations with Newton-Raphson IRR
- Dashboard rendering with supporting comparables

### Mock mode (default, `USE_MOCK_DATA=true`)

- SQLite persistence with seeded demo datasets
- 3 markets: Austin TX, Nashville TN, Scottsdale AZ
- 15 properties, 18 rental comps, 15 comparable sales
- AI summary defaults to heuristic mode unless `OPENAI_API_KEY` is configured

## Where real integrations slot in

The live provider layer is already built for listings, STR analytics, and macro data. Remaining integrations to add:

- **Comparable sales / valuation**: ATTOM Data or CoreLogic API
- **Operations / bookings**: Guesty, Hospitable, or Hostaway PMS API
- **Accounting**: QuickBooks or Xero API
- **Renovation costs**: RSMeans construction cost API

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
