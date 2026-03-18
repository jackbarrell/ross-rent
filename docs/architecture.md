# Architecture Summary

## PoC shape

- Frontend: Next.js 15 + React 19 (App Router, static export)
- Backend: Express + TypeScript (ESM modules)
- Storage: SQLite (`backend/.local/ross_rent.sqlite`) — properties, comps, deal pipeline
- Data: seeded mock fixtures in `data/` (8 JSON files, 5 markets)
- Styling: Pure CSS with custom properties / dark theme

## Core modules

1. **ListingDataProvider**
   - `MockListingProvider`: reads for-sale properties via SQLite
   - `LiveListingProvider`: RentCast API integration (15-min cache)

2. **ShortTermRentalDataProvider**
   - `MockShortTermRentalProvider`: reads rental comparables + assumptions from SQLite/JSON
   - `LiveShortTermRentalProvider`: Mashvisor API integration with regional seasonality

3. **AnalysisEngine**
   - Deterministic formulas for ADR, occupancy, gross revenue, costs, NOI, yield proxy, score
   - Monthly seasonality curves (12 factors per market)
   - Bedroom/property-type adjustments, ADR override support for calibration

4. **FinancialModelEngine**
   - 5-year P&L with configurable revenue/cost growth rates
   - Amortisation with monthly payment and balance formulas
   - Refinance at year 3 with cash-out feeding years 4-5
   - Newton-Raphson IRR solver with convergence fallback
   - Cash-on-Cash and DSCR per year

5. **RenovationCostEngine**
   - Keyword-based auto-inference from property descriptions
   - Manual renovation editor (17-category cost library)
   - Capex + timeline estimation

6. **ValuationEngine**
   - Comparable sales filtering (location, ±40% sqft, ±1 bed/bath)
   - Recency-weighted composite scoring over 2-year window
   - Post-renovation value and equity uplift calculation
   - Live comparable sales via RentCast API

7. **MacroDataProvider**
   - Mock: JSON fixtures for 5 markets
   - Live: 7 FRED series + WalkScore + Census Bureau (population, income)
   - Composite economic trend and market growth scoring

8. **OperationsDataProvider**
   - Booking ingestion from JSON fixtures
   - Monthly breakdown: ADR, occupancy (actual calendar days), revenue

9. **AccountingProvider**
   - Categorised income/expense entries
   - Property-level and company-level P&L aggregation
   - Dynamic period computation from actual data dates

10. **ForecastEngine**
    - Predicted vs actual comparison (ADR, occupancy, revenue)
    - Heuristic explanations and concrete adjustment suggestions
    - Calibration endpoint applies both ADR override and vacancy buffer

11. **AiSummaryService**
    - Optional OpenAI Responses API for narrative summary
    - Deterministic heuristic fallback (verdict + upside/downside/assumptions)

12. **MemoGenerator**
    - 8-section investment memo from upstream analysis outputs
    - Full markdown compilation with formatted tables
    - `.md` file download

## Frontend pages

1. **Landing** — location selector, property grid with sorting, AI-ranked table
2. **Property Detail** — 9-tab analysis (market, macro, renovation, valuation, financials, sensitivity, operations, forecast, memo)
3. **Portfolio** — portfolio summary + company P&L with drill-down
4. **Forecast** — cross-property forecast vs actual dashboard
5. **Compare** — side-by-side property comparison (up to 5)
6. **Pipeline** — deal pipeline with 5-status tracking
7. **About** — lifecycle stages and architecture overview

## Request flow

1. User chooses location in frontend.
2. Frontend requests `/api/properties?location=...`.
3. User selects property.
4. Frontend requests `/api/analysis/:propertyId`.
5. Backend loads property + rental comps + assumptions.
6. `AnalysisEngine` computes metrics with monthly seasonality.
7. `AiSummaryService` generates summary (OpenAI or heuristic).
8. Frontend renders 9-tab detail view with all analysis panels.
9. User can adjust assumptions, compare properties, generate memo, track deals.
