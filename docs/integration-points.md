# Integration Points for Real Data

## Current Live API Integrations

Set `USE_MOCK_DATA=false` in `.env` and provide API keys to activate live data. The system gracefully degrades — if an API call fails, routes return appropriate errors.

### ListingDataProvider → RentCast API

**Provider:** `LiveListingProvider` in `backend/src/providers/liveProviders.ts`
**API:** [RentCast](https://developers.rentcast.io) — property listings, comparable sales
**Env var:** `RENTCAST_API_KEY`

Features:
- Searches for-sale listings by city/state
- Returns normalised `PropertyListing` objects
- 15-minute in-memory cache per location
- Supports any US city (not limited to 3 demo markets)

### ShortTermRentalDataProvider → Mashvisor API

**Provider:** `LiveShortTermRentalProvider` in `backend/src/providers/liveProviders.ts`
**API:** [Mashvisor](https://www.mashvisor.com/api) — Airbnb/STR analytics
**Env var:** `MASHVISOR_API_KEY`

Features:
- Fetches active Airbnb listings as rental comparables
- Returns ADR, occupancy, reviews per comp
- Regional seasonality curves by state (TX, TN, AZ, FL, CO, CA + default)

### MacroDataProvider → FRED + WalkScore + Census Bureau APIs

**Provider:** `fetchLiveMacroData()` in `backend/src/providers/liveProviders.ts`
**APIs:** [FRED](https://fred.stlouisfed.org/docs/api/fred/) (Federal Reserve) + [WalkScore](https://www.walkscore.com/professional/api.php) + [Census Bureau](https://www.census.gov/data/developers.html)
**Env vars:** `FRED_API_KEY`, `WALKSCORE_API_KEY`, `CENSUS_API_KEY`

Features:
- 7 FRED series: unemployment (LAUST), median home price (ATNHPIUS), mortgage rate (MORTGAGE30US), CPI inflation (CPIAUCSL), building permits (PERMIT), median rent (MEDRENTX), employment (PAYEMS)
- WalkScore by lat/lng coordinate
- Census Bureau: population (B01003_001E), median household income (B19013_001E) via ACS 5-year estimates
- Composite economic trend scoring (4-factor: unemployment, appreciation, employment, mortgage)
- Composite market growth scoring (4-factor: population, appreciation, employment, permits)
- 30-state FIPS mapping for state-level FRED series

### Comparable Sales → RentCast API

**Provider:** `fetchLiveComparableSales()` in `backend/src/providers/valuationEngine.ts`
**API:** [RentCast](https://developers.rentcast.io) — comparable sales by location
**Env var:** `RENTCAST_API_KEY`

Features:
- Fetches recent comparable sales within 1 mile of subject property
- Merges live sales with local data in `getComparableSales()`
- 30-minute in-memory cache per property
- Quality level inference from year built
- Wired into valuation, memo, and comparison routes

## Still Using Mock/Local Data

These providers still use local JSON fixtures in all modes. To replace with live APIs:

### Operations / Bookings
Replace `operationsDataProvider.ts` with a PMS integration: [Guesty](https://guesty.com), [Hospitable](https://hospitable.com), or [Hostaway](https://www.hostaway.com).

### Accounting
Replace `accountingProvider.ts` with [QuickBooks API](https://developer.intuit.com), [Xero API](https://developer.xero.com), or [Stessa](https://www.stessa.com).

### Renovation Cost Library
The cost library (`data/cost_library.json`) contains 17 categories with real-world unit costs. This could be replaced with a construction cost API like [RSMeans](https://www.rsmeans.com).

## AI Layer

`AiSummaryService` already supports optional OpenAI usage.
In production:
- store prompts and outputs for auditability
- introduce guardrails/templates per market
- capture explainability fields and prompt versions
