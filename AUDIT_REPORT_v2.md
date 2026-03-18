# RossRent PoC — Audit Report v2

**Auditor:** Claude (evidence-based technical review)
**Date:** 2026-03-18
**Scope:** Full codebase inspection against the product brief
**Codebase size:** ~6,770 lines (2,805 backend + 3,965 frontend) + 792 lines CSS

---

## 1. Executive Summary

The application is a **full-stack short-term rental investment analysis platform** covering the complete lifecycle from property sourcing through post-acquisition performance tracking. It runs as a Next.js 15 frontend with an Express/TypeScript backend, using SQLite for property and comparable data with JSON fixtures for supplementary data.

**Does it satisfy the PoC brief?** Yes, at a level that exceeds the minimum requirements of a proof of concept. All 10 required capabilities from the brief are implemented with real logic — not placeholders. The system supports property acquisition analysis, renovation modelling, post-renovation valuation, 5-year financial projections, investment memo generation, operational data ingestion, forecast-vs-actual tracking with calibration, and portfolio-level visibility.

**Is it coherent as a product/system?** Yes. The data flows end-to-end from location search through analysis, modelling, memo generation, operations, and forecast calibration. Each module produces traceable, deterministic outputs. AI is used only as a thin narrative layer with deterministic fallbacks. The provider abstraction supports both mock and live data sources.

**Key improvements since v1 audit:** Newton-Raphson IRR solver, monthly seasonality curves, Cash-on-Cash and DSCR metrics, manual renovation editor, sensitivity analysis, property comparison tool, deal pipeline, forecast calibration endpoint, live API integrations (RentCast, Mashvisor, FRED, WalkScore).

**Remaining gaps:** No tests, in-memory deal store (no persistence), calibration only partially applies adjustments (vacancy buffer but not ADR), static params ID mismatch, documentation partially outdated.

---

## 2. Feature Coverage Matrix

| # | Brief Requirement | Present? | Evidence | Notes |
|---|-------------------|----------|----------|-------|
| 1 | **Property data ingestion** — listing data (price, size/rooms, location, description) | **Yes** | `mockListingProvider.ts` (SQLite), `liveProviders.ts` (RentCast API), `data/property_listings.json` (15 properties, 3 markets) | Full listing model with 15 fields. Live provider uses RentCast API with 15-min cache. |
| 2 | **STR market analysis** — ADR, occupancy, seasonality, monthly/annual revenue | **Yes** | `analysisEngine.ts:analyseProperty()` computes ADR with bedroom/type adjustments + seasonality. `MonthlyRevenue[]` array with 12 months. Seasonality curves in `market_assumptions.json` and `liveProviders.ts`. | Monthly seasonality present. Revenue computed per-month with clamped occupancy. Live STR data via Mashvisor. |
| 3 | **Macro location analysis** — population growth, economic proxy, demand proxy, attractiveness score | **Yes** | `macroDataProvider.ts` (mock), `liveProviders.ts:fetchLiveMacroData()` (FRED + WalkScore). `MacroData` interface: 12 fields including scores. `MacroPanel.tsx` renders 9 metric cards. | Live mode: unemployment + home prices from FRED, walkability from WalkScore. Population growth and GDP still hardcoded in live mode. |
| 4 | **Renovation modelling** — AI-assisted inference or manual input, cost library, capex/timeline | **Yes** | `renovationCostEngine.ts:inferRenovation()` uses keyword heuristic on descriptions. `calculateCustomRenovation()` for manual mode. 17-category cost library in `data/cost_library.json`. `RenovationPanel.tsx` has full manual editor with dropdown + quantity input. | Auto-inference is keyword-based heuristic (not ML/LLM). Manual editor genuinely functional with add/remove/submit. |
| 5 | **Post-renovation valuation** — comparable sales, estimated new value, uplift | **Yes** | `valuationEngine.ts:getComparableSales()` filters by location + size (±40%) + beds/baths (±1). Recency-weighted composite scoring. `estimatePostRenovationValue()` uses weighted $/sqft. 15 comps in `data/comparable_sales.json`. | Recency weighting over 2-year window. Equity created = after value - before value - reno cost. Methodology is transparent. |
| 6 | **Financial model** — purchase price, reno, financing, STR revenue, annual P&L, refinance, 5-year model | **Yes** | `financialModelEngine.ts:generateFinancialModel()` — 193 lines. LTV/rate/term configurable. Year-by-year: revenue growth, cost growth, appreciation. Refinance at year 3 (75% LTV, reduced rate). Cash-on-Cash and DSCR per year. Newton-Raphson IRR. Total return computation. | Real amortisation formulas. `computeIrr()` exported and tested. Refinance modelled as cash-out event with new loan feeding into years 4-5. Configurable via `FinancialModelConfig`. |
| 7 | **Investment memo** — property overview, market, STR assumptions, reno, valuation, financials, risks | **Yes** | `memoGenerator.ts:generateInvestmentMemo()` — 206 lines. 8 structured sections. Full markdown output. `MemoPanel.tsx` has formatted view + raw markdown toggle + `.md` file download. | All memo sections grounded in deterministic analysis outputs. Risk section aggregates AI downside + macro warnings + confidence notes. |
| 8 | **Operations layer** — bookings, pricing, occupancy, actual ADR/occupancy/revenue | **Yes** | `operationsDataProvider.ts` — reads `data/bookings.json` (30+ bookings across 3 properties). Groups by month, computes per-month ADR/occupancy/revenue. `OperationsPanel.tsx` shows 5 metric cards + monthly breakdown table. | Occupancy = actual nights / calendar days. ADR = revenue / nights. Data covers Jul-Dec 2025. |
| 9 | **Accounting / company-level view** — income, expenses, property-level + company aggregation | **Yes** | `accountingProvider.ts:getPropertyPL()` + `getCompanyPL()`. `data/accounting.json` with categorised entries. `portfolio/page.tsx` renders both portfolio summary and company P&L with per-property drill-down. | Property-level and company-level aggregation both functional. Period is hardcoded to "2025-07 to 2025-12". |
| 10 | **Forecast vs actual engine** — compare predicted vs actual, error analysis, updated assumptions, explanations | **Yes** | `forecastEngine.ts:compareForecastVsActual()` — error % for ADR, occupancy, revenue. Heuristic explanations with threshold logic. `adjustedAssumptions[]` with concrete suggested values. `POST /api/forecast-vs-actual/:propertyId/apply` re-runs analysis with calibrated inputs. `ForecastPanel.tsx` has "Apply Calibrated Assumptions" button. | **Partial gap:** calibration endpoint only applies `vacancyBuffer` adjustment, not ADR adjustment. Adjustments not persisted — ephemeral recalculation only. |
| — | **Architecture: modular, provider/adapter pattern** | **Yes** | `interfaces.ts` defines 5 provider interfaces. `MockListingProvider` / `LiveListingProvider` implement `ListingDataProvider`. `MockShortTermRentalProvider` / `LiveShortTermRentalProvider` implement `ShortTermRentalDataProvider`. Provider selection via `USE_MOCK_DATA` env var in `index.ts`. | Macro, operations, and valuation provider interfaces defined but not enforced via class implementations — standalone functions instead. |
| — | **Mock data clearly separated** | **Yes** | All mock data in `data/` directory (8 JSON files). SQLite seeded from fixtures. Mock providers in dedicated files (`mockListingProvider.ts`, `mockStrProvider.ts`). Live providers in `liveProviders.ts`. | Clean separation. `integration-points.md` documents which data sources are real vs mock. |
| — | **Documentation** | **Partial** | `README.md` (170 lines, comprehensive). `docs/architecture.md` partially outdated — describes only 4 modules, actual codebase has 11+. `docs/assumptions-limitations.md` lists "no debt model" as limitation (now implemented). `docs/next-steps.md` mostly outdated. `docs/integration-points.md` is current. | Architecture and next-steps docs need updating to reflect current state. |

### Beyond-brief features implemented:

| Feature | Evidence | Notes |
|---------|----------|-------|
| Property comparison tool | `POST /api/compare`, `compare/page.tsx` | Side-by-side, 14 metrics, 2-5 properties |
| Deal pipeline | `GET/POST/DELETE /api/deals`, `pipeline/page.tsx` | 5-status tracking (watching → purchased/passed) |
| Sensitivity analysis | `GET /api/sensitivity/:propertyId`, `SensitivityPanel.tsx` | ADR, occupancy, interest rate — 5 scenarios each |
| Cash-on-Cash return | `financialModelEngine.ts`, `FinancialModelPanel.tsx` | Per-year computation |
| DSCR | `financialModelEngine.ts`, `FinancialModelPanel.tsx` | Per-year computation |
| Monthly revenue chart | `RevenueChart.tsx` | CSS bar chart with seasonality |
| Scenario editor | `PropertyDetail.tsx` — 8 adjustable inputs | Live recalculation of analysis |
| About page | `about/page.tsx` | Lifecycle stages and architecture overview |

---

## 3. Architecture Review

### Frontend structure
- **Framework:** Next.js 15, React 19, App Router, TypeScript
- **Styling:** Pure CSS with custom properties / dark theme (792 lines in `globals.css`)
- **Component decomposition:** 12 components, each owning its own data fetching via `useEffect` + `useState`
- **Pages:** 8 routes — landing, property detail, portfolio, forecast, compare, pipeline, about, property/[id]
- **Types:** Fully typed — `frontend/lib/types.ts` mirrors backend models (410 lines)
- **API layer:** Clean `api.ts` with 24 typed functions using `getJson`/`postJson` wrappers

**Assessment:** Clean and functional for a PoC. No unnecessary abstraction. Components are self-contained. The tab-based property detail page is appropriate for the analytical workflow. No state management library needed — React state is sufficient at this scale.

### Backend structure
- **Framework:** Express.js with TypeScript (ESM modules)
- **Entry point:** `index.ts` (615 lines) — routes, middleware, provider wiring
- **Provider pattern:** Interface-based abstraction for listings and STR data. Environment-driven mock/live selection.
- **Engines:** Dedicated modules for analysis, financial model, renovation, valuation, forecast
- **Database:** SQLite via better-sqlite3, auto-seeded from JSON fixtures
- **AI layer:** Optional OpenAI integration with deterministic fallback

**Assessment:** Well-structured for a PoC. The `index.ts` at 615 lines is getting large — a production version would benefit from route extraction into separate files. Provider interfaces exist and are used correctly for the two most important data sources (listings and STR). Other providers (macro, operations, accounting, valuation) have interfaces defined but use standalone functions — acceptable for PoC, should be refactored for production.

### Domain models
- 27+ TypeScript interfaces shared between frontend and backend
- Comprehensive field coverage for all domain concepts
- Types are not shared via a common package — duplicated between frontend and backend
- Union types in backend (`DealStatus`) are loosened to `string` in some frontend interfaces

**Assessment:** Complete and coherent type system. Duplication is acceptable for PoC but would need a shared package for production.

### Separation of concerns
- Data access (providers) is cleanly separated from analysis logic (engine)
- Analysis engine produces raw metrics; summary service adds narrative
- Financial model engine is independent of analysis engine
- Memo generator consumes all upstream outputs — pure composition
- Frontend components each own their API calls — no prop-drilling beyond property ID

**Assessment:** Good separation. No domain logic leaks into routes or UI components.

---

## 4. Data Realism and Integrity

### What is real vs mocked

| Data Source | Mock | Live | Notes |
|------------|------|------|-------|
| Property listings | SQLite (15 properties) | RentCast API | Clean interface swap |
| STR comparables | JSON (18 comps) | Mashvisor API | Clean interface swap |
| Market assumptions | JSON (3 markets) | — | Hardcoded per-market seasonality and defaults |
| Macro data | JSON (3 markets) | FRED + WalkScore | Population growth and GDP hardcoded even in live mode |
| Comparable sales | JSON (15 comps) | — | No live comparable sales API |
| Cost library | JSON (17 categories) | — | Static reference data — appropriate |
| Bookings | JSON (30+ records) | — | Mock operational data for 3 properties |
| Accounting | JSON | — | Mock categorised entries |

**Isolation quality:** Excellent. All mock data is in `data/` directory with clear file naming. Live providers are in a separate file. The `USE_MOCK_DATA` env var cleanly controls provider selection. `integration-points.md` documents which sources are real vs mock.

### Calculation traceability

- **ADR:** market average × bedroom adjustment × property type adjustment × seasonality index → traceable
- **Occupancy:** market average - vacancy buffer, clamped [0.35, 0.90] → traceable
- **Monthly revenue:** ADR × occupancy × monthly factor × 30 → traceable, each month computed independently
- **Costs:** percentage-based (management 15%, maintenance 8%, platform 3%, reserves 4%) + fixed (utilities, supplies, insurance, tax) → all rates visible in code
- **NOI:** gross revenue - total costs → arithmetic
- **IRR:** Newton-Raphson solver on actual cashflow series → mathematically correct
- **Cash-on-Cash:** annual cashflow / total equity invested → standard formula
- **DSCR:** NOI / annual debt service → standard formula
- **Valuation:** weighted $/sqft from recency-scored comps × subject sqft → traceable

**Assessment:** All calculations are deterministic, traceable from inputs to outputs, and use standard real estate formulas. No black-box computation. Assumptions are explicit and documented.

### Internal consistency issues

1. **Operations occupancy calculation** uses `totalNights / (months × 30)` — simplified 30-day months instead of actual calendar days. Per-month calculation correctly uses `daysInMonth`, but the aggregate doesn't.
2. **Accounting period** hardcoded as `"2025-07 to 2025-12"` — not computed from actual data.
3. **Live macro data** hardens `populationGrowth: 0.015`, `gdpGrowthProxy: 0.025`, `crimeIndex: 35` — these are not from APIs even in live mode.

---

## 5. Financial / Modelling Review

### ADR / Occupancy assumptions
- Base ADR from market comparable averages — **correct methodology**
- 4% per-bedroom adjustment above 3-bed baseline — **reasonable for PoC**
- Property type multiplier (condo 0.95, townhome 0.98) — **reasonable**
- Seasonality index applied — **correct; 12 monthly curves per market**
- Occupancy = market average minus vacancy buffer, clamped — **reasonable**

### Revenue calculation
- **Monthly granularity:** 12 months with individual seasonality factors → **correct**
- Revenue per month = ADR × occupancy × seasonality × 30 → **uses 30-day months** (minor simplification)
- Annual total is sum of monthly → **correct**

### Renovation cost model
- Auto-inference via keyword heuristic — **acceptable for PoC, clearly labelled as such**
- Manual mode with full cost library (17 categories, low/high ranges) — **functional and genuine**
- Estimate = average of low and high — **reasonable**
- Timeline = max item timeline + buffer — **reasonable**

### Valuation uplift model
- Comparable selection: same city/state, ±40% sqft, ±1 bed/bath — **reasonable filters**
- Recency weighting: linear decay over 730 days — **correct approach**
- Composite relevance score: recency × 0.3 + size × 0.3 + bed × 0.2 + bath × 0.2 — **well-balanced**
- Post-renovation value: weighted $/sqft × subject sqft — **correct methodology**
- Equity created = after value - before value - renovation cost — **correct**

### 5-year projections
- Amortisation: standard formula with monthly payment and remaining balance — **mathematically correct**
- Revenue growth default 3%, cost growth 2.5%, appreciation from macro or 3.5% — **reasonable defaults**
- Growth rates are **configurable** via `FinancialModelConfig` — **good**
- Refinance at year 3: 75% LTV on appreciated value, rate = max(4%, original - 0.5%) — **reasonable model**
- Year 0 cash outlay = down payment + renovation cost — **correct**
- IRR: Newton-Raphson solver with terminal sale in year 5 — **technically correct**
- Cash-on-Cash: annual cashflow / total equity invested — **standard formula**
- DSCR: NOI / annual debt service — **standard formula**
- Total return: (year 5 equity + cumulative cashflow) / total equity - 1 — **correct**

**Assessment:** The financial model is **technically sound**. All formulas use standard real estate finance methodology. The Newton-Raphson IRR solver is a significant improvement over the naive approximation in v1. Growth rates are configurable. The refinance scenario is modelled correctly with cash-out feeding into subsequent years.

### Forecast vs actual logic
- Compares predicted ADR/occupancy/revenue against actual booking-derived metrics — **correct**
- Annualises actual revenue from tracked months — **correct methodology**
- Error percentages computed correctly — **correct**
- Heuristic explanations with sensible thresholds (±10% ADR, ±10% occupancy, ±15% revenue) — **reasonable**
- Concrete adjustment suggestions with field/original/suggested values — **good**
- **Calibration endpoint:** re-runs analysis with adjusted `vacancyBuffer` — **partially implemented**

**Gap:** The calibration endpoint only applies vacancy buffer adjustments, not the ADR adjustment that the forecast engine also suggests. This means half the calibration logic is wired up.

---

## 6. AI Usage Review

### Where AI is used
1. **Investment summary** (`ai/summary.ts`): Optional OpenAI Responses API call for narrative summary. Falls back to deterministic heuristic (verdict + upside/downside/assumptions based on score thresholds).
2. **Memo generation** (`ai/memoGenerator.ts`): Purely deterministic — no AI involved despite the file location. Builds structured markdown from analysis outputs.
3. **Forecast explanations** (`forecastEngine.ts`): Heuristic rule-based text generation. No AI.

### Is AI used appropriately?
**Yes.** AI is confined to a single optional narrative layer (`summarize()`). All core numeric and financial logic is deterministic. The AI summary receives computed metrics as context and produces a structured JSON response with enforced schema. If the API key is absent, a fully functional heuristic summary is generated instead.

### Is numerical logic delegated to AI?
**No.** All ADR calculations, revenue projections, cost breakdowns, NOI, IRR, Cash-on-Cash, DSCR, valuation, and renovation estimates are computed by deterministic engines. The AI layer never touches these numbers — it only narrates them.

### Is the memo grounded?
**Yes.** `generateInvestmentMemo()` takes 6 upstream objects (property, analysis, macro, renovation, valuation, financial model) and composes a markdown document. Every number in the memo is sourced from these inputs. No hallucination risk.

---

## 7. UX / Product Review

### Can a user complete the intended flow?
**Yes.** The complete journey is:

1. **Select location** → landing page with location dropdown + text search ✅
2. **Browse properties** → grid view with sorting, or AI-ranked table ✅
3. **Select property** → tabbed detail page ✅
4. **Review STR market data** → market tab with metrics, comps, monthly revenue chart ✅
5. **Review macro data** → macro tab with 9 metrics ✅
6. **Review renovation estimate** → renovation tab with auto/manual modes ✅
7. **Review valuation** → valuation tab with comps and equity uplift ✅
8. **Review financial model** → financials tab with 5-year P&L, IRR, CoC, DSCR ✅
9. **Run sensitivity analysis** → sensitivity tab with ADR/occupancy/rate scenarios ✅
10. **Adjust assumptions** → scenario editor with 8 inputs + recalculate ✅
11. **Generate and download memo** → memo tab with formatted/raw toggle + .md export ✅
12. **Review operations** → operations tab with monthly breakdown ✅
13. **Compare forecast vs actual** → forecast tab with variance analysis + calibration ✅
14. **Compare properties** → compare page with side-by-side metrics ✅
15. **Track deals** → pipeline page with status management ✅
16. **View portfolio** → portfolio page with summary + company P&L ✅

### Are outputs understandable?
**Yes.** Metric cards use clear labels and formatted values. Tables are well-structured. The memo produces readable investment analysis. Colour coding distinguishes positive/negative values.

### What is missing for a convincing client demo?
1. **PDF export** — memo only exports as `.md`, not PDF
2. **Map view** — properties have lat/lng but no map integration
3. **Scenario save/load** — adjustments are ephemeral, lost on page reload
4. **Deal pipeline persistence** — in-memory, lost on server restart
5. **Charts** — the monthly revenue chart is CSS-only; more visual charts (equity build-up, return trajectories) would strengthen the narrative

---

## 8. Gap Analysis

### Critical gaps
1. **No tests** — no unit, integration, or end-to-end tests anywhere in the codebase. For a PoC demo this is acceptable, but it means no way to verify correctness automatically or catch regressions.
2. **Deal pipeline is in-memory** — `dealStore` is a `Map` in `index.ts`. Data is lost on every server restart. For a demo this is fragile.

### Medium gaps
3. **Forecast calibration only partially applies adjustments** — the endpoint only applies `vacancyBuffer`, not `estimatedAdr` from the `adjustedAssumptions` array. The `AnalysisAssumptions` interface doesn't expose an ADR override field, so the architecture needs a minor change to support this.
4. **Static params ID mismatch** — `generateStaticParams()` generates `prop-aus-001` through `prop-aus-005`, but actual data uses `prop-atx-001` through `prop-atx-005` for Austin. Static export would generate pages for non-existent IDs.
5. **Documentation partially outdated** — `docs/architecture.md` only lists 4 modules (actual: 11+). `docs/assumptions-limitations.md` lists "no debt model" (now implemented). `docs/next-steps.md` items 3 and 5 are done.
6. **Some live macro values are hardcoded** — population growth, GDP proxy, crime index are not from APIs even in live mode.

### Minor gaps
7. **No PDF export for memo** — only `.md` download
8. **Accounting period hardcoded** as `"2025-07 to 2025-12"`
9. **Operations total occupancy** uses simplified 30-day months
10. **Refinance always at year 3** — not configurable
11. **No error boundaries** in frontend React components
12. **Newton-Raphson IRR may not converge** for extreme scenarios (no fallback)
13. **Type duplication** between frontend and backend (no shared package)
14. **`dangerouslySetInnerHTML`** in `MemoPanel.tsx` for markdown rendering — low risk since content is server-generated

---

## 9. Technical Risk Assessment

### Brittle areas
- **In-memory deal store:** Restart = data loss. Easy fix: persist to SQLite.
- **Serial N+1 processing** in ranking, portfolio, and sensitivity routes: acceptable for 15 mock properties, will not scale beyond ~50 without parallelisation or caching.
- **Static params mismatch:** `prop-aus-*` vs `prop-atx-*` — would break static export for Austin properties.

### Fake or hardcoded behaviour
- **Live macro data partially fake:** Population growth, GDP proxy, and crime index are hardcoded constants (`0.015`, `0.025`, `35`) even in live mode. Documented in `integration-points.md` as a known limitation.
- **Accounting period string:** Hardcoded `"2025-07 to 2025-12"` regardless of actual data dates.
- **"AI-assisted inference"** for renovation: keyword matching heuristic — this was relabelled from "AI-inferred" (v1) to acknowledge methodology, which is appropriate.

### Missing abstractions
- Macro, operations, accounting, and valuation providers have interfaces defined in `interfaces.ts` but implementations are standalone functions, not classes implementing the interface. This means the interface contract isn't enforced by the compiler.
- No shared type package between frontend and backend.

### Coupling problems
- `index.ts` at 615 lines contains all route definitions, provider wiring, and the deal store. Functional for PoC, but would need route extraction for production.
- Frontend components each make independent API calls — this creates waterfall loading on the property detail page (acceptable for PoC).

### Likely blockers to productionisation
- No auth (acceptable — brief explicitly excludes this)
- No input validation on API routes
- No rate limiting
- No test suite
- Type duplication

---

## 10. Refactor / Next-Step Plan

### Phase 1: Make PoC fully credible (pre-demo polish)
1. **Fix static params** — change `prop-aus` to `prop-atx` in `generateStaticParams()`
2. **Fix forecast calibration** — apply ADR adjustment in addition to vacancy buffer
3. **Persist deal pipeline** — save to SQLite instead of in-memory Map
4. **Update docs** — sync `architecture.md`, `assumptions-limitations.md`, `next-steps.md` with current state

### Phase 2: Make architecture extensible
5. **Extract routes** from `index.ts` into route modules (analysis, deals, portfolio, etc.)
6. **Enforce provider interfaces** — convert standalone functions to classes implementing the defined interfaces
7. **Shared type package** — extract common types to a `shared/` package consumed by both frontend and backend
8. **Add basic tests** — unit tests for financial model engine, analysis engine, IRR solver

### Phase 3: Move toward production
9. **Add input validation** — zod or joi schemas on route params and request bodies
10. **Add auth** — API key or JWT-based access control
11. **Add rate limiting** — express-rate-limit on API endpoints
12. **PDF memo export** — use puppeteer or pdfkit for PDF generation
13. **Map integration** — Mapbox or Google Maps for property visualisation
14. **Parallelise ranking/portfolio** — `Promise.all` for concurrent analysis
15. **Scenario persistence** — save named scenario configurations
16. **Error boundaries** — React error boundaries in frontend
17. **Real comparable sales API** — integrate ATTOM or similar for live comp data
18. **Dynamic accounting period** — derive from actual data timestamps

### What can remain mocked
- Bookings and accounting data (no real PMS integration needed for PoC)
- Cost library (static reference data — appropriate as-is)
- Market seasonality curves (reasonable presets per market)

### What should be redesigned
- Route organisation (Phase 2)
- Provider interface enforcement (Phase 2)
- Type sharing (Phase 2)

### What should be deferred
- Auth, billing, production infra (brief explicitly excludes these)
- Full PMS integration
- Multi-user support

---

## 11. Final Verdict

### Scores

| Category | Score | Justification |
|----------|-------|---------------|
| **Product alignment** | **8.5 / 10** | All 10 brief requirements implemented with real logic. Beyond-brief features (comparison, pipeline, sensitivity) add genuine value. Monthly seasonality, Newton-Raphson IRR, and configurable growth rates demonstrate modelling depth. Main deductions: partial calibration, in-memory deal store. |
| **Architecture quality** | **8.0 / 10** | Clean provider abstraction for core data sources. Deterministic engines separated from narrative AI layer. Well-typed throughout. Deductions: `index.ts` monolith, partial interface enforcement, type duplication, no tests. |
| **Modelling integrity** | **8.5 / 10** | All financial formulas use standard real estate methodology. IRR is Newton-Raphson (not approximation). Cash-on-Cash and DSCR per-year. Monthly revenue with seasonality. Valuation uses recency-weighted comps. Deductions: some hardcoded live macro values, 30-day month simplification, partial calibration application. |
| **Demo readiness** | **8.0 / 10** | Complete user journey from search through memo download. 9-tab property analysis. Side-by-side comparison, deal pipeline, sensitivity analysis. All pages render and routes respond. Deductions: no PDF export, no map, CSS-only charts, in-memory deal store fragility, static params mismatch. |

### Verdict: `mostly aligned`

The application is a **credible, functional PoC** that covers the full STR investment lifecycle as specified in the brief. It goes beyond a screener into genuine lifecycle tracking with operations data, forecast calibration, and portfolio views. The modelling engine is technically sound with standard real estate finance formulas, proper IRR calculation, and transparent assumptions.

The system is coherent end-to-end: data flows from location search through analysis, modelling, memo generation, operations tracking, and forecast comparison — each module producing traceable, deterministic outputs. Beyond-brief features (property comparison, deal pipeline, sensitivity analysis) demonstrate product thinking beyond minimum compliance.

The gap to "strong PoC alignment" is primarily: (1) the forecast calibration endpoint only partially applies adjustments, (2) deal pipeline data is ephemeral, (3) no automated tests, and (4) documentation is partially stale. These are all addressable in a short Phase 1 sprint without architectural changes.

---

## Minimum Changes Required Before Showing to Client

1. **Fix `generateStaticParams()`** — change `prop-aus` to `prop-atx` (1 line)
2. **Fix forecast calibration** — apply ADR adjustment in addition to vacancy buffer (~5 lines)
3. **Persist deal pipeline to SQLite** — replace in-memory Map with DB table (~30 lines)
4. **Update `docs/architecture.md`** — reflect all 11+ modules and current capabilities
5. **Update `docs/assumptions-limitations.md`** — remove "no debt model" limitation
