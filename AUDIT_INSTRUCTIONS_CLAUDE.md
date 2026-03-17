# Audit Instructions For Claude

You are auditing the `ross_rent` repository as an evidence-based product and technical reviewer.

Your job is not to rewrite the app. Your job is to inspect the codebase, determine how closely it matches the product brief, identify architectural and implementation gaps, and produce a precise review.

Assume this is a proof of concept for a property investor focused on buying, renovating, and operating short-term rental properties.

## Product Brief To Assess Against

The system should evaluate, justify, and track short-term rental property investments across the full lifecycle.

It should demonstrate:

- property acquisition analysis
- renovation cost modelling
- post-renovation valuation
- 5-year financial projections
- automated investment memo generation
- live vs forecast performance tracking
- portfolio-level financial visibility

Core flow:

1. User inputs a location or property
2. System retrieves:
   - properties for sale
   - short-term rental market data
   - macroeconomic data for the area
3. User selects a property
4. System performs full analysis:
   - STR revenue potential
   - renovation requirements and cost
   - post-renovation valuation
   - financing and 5-year financials
5. System generates an investment memo
6. System simulates or ingests operational data
7. System compares forecast vs actual and updates assumptions

Required capabilities:

1. Property data ingestion
- listing data
- price, size/rooms, location, description

2. STR market analysis
- ADR
- occupancy
- seasonality
- projected monthly and annual revenue

3. Macro location analysis
- population growth
- economic growth proxy
- demand proxy
- market attractiveness score

4. Renovation modelling
- AI-assisted inference from listing description or manual input
- cost library of typical works
- capex and timeline estimate

5. Post-renovation valuation
- comparable sales based valuation
- estimated new value and uplift

6. Financial model
- purchase price
- renovation cost
- financing assumptions
- STR revenue assumptions
- annual revenue, costs, net income, cashflow, equity trajectory
- simplified refinance scenario
- 5-year P&L style model

7. Investment memo generation
- property overview
- market analysis
- STR assumptions
- renovation plan
- valuation uplift
- financial projections
- risks and assumptions
- markdown or PDF output

8. Operations layer
- bookings
- pricing
- occupancy
- actual ADR / occupancy / revenue

9. Accounting / company-level view
- income
- expenses
- property-level and company-level aggregation

10. Forecast vs actual engine
- compare predicted vs actual ADR / occupancy / revenue
- error analysis
- updated assumptions
- explanation of discrepancies

Architecture expectations:

- modular components
- listing data provider
- rental data provider
- macro data provider
- renovation cost engine
- valuation engine
- financial model engine
- operations data provider
- accounting provider
- analysis engine
- memo generator
- support for real APIs later, mock data now

Constraints:

- PoC only
- no need for auth, billing, production infra, or full PMS

Deliverables expected from the app:

- working local application
- frontend + backend
- sample datasets
- analysis logic
- documentation
- clear separation between mocked and real integrations

## Review Rules

- Be exacting and evidence-based.
- Do not give credit for intentions that are not implemented.
- Cite concrete files, functions, components, routes, and models.
- Distinguish clearly between:
  - UI placeholder
  - mocked implementation
  - real logic
  - missing capability
- If something looks simulated, say so explicitly.
- If something is conceptually wrong, say so explicitly.
- If something is acceptable for a PoC, say that too.

## Output Format

Produce:

1. A concise executive summary
2. A feature coverage matrix
3. The full detailed review
4. A final scored assessment out of 10 for:
   - product alignment
   - architecture quality
   - modelling integrity
   - demo readiness

If possible, finish with a short list titled:

`Minimum changes required before showing this to the client`

Use the following sections:

### 1. Executive summary
State:
- what the app currently is
- whether it actually satisfies the PoC brief
- whether it is coherent as a product/system

### 2. Feature coverage matrix
Create a table with columns:
- Brief requirement
- Present? (`Yes` / `Partial` / `No`)
- Evidence in code
- Notes

Be strict. `Present` means genuinely implemented, not merely implied by UI text.

### 3. Architecture review
Assess:
- frontend structure
- backend structure
- domain models
- separation of concerns
- provider / adapter pattern usage
- whether analysis logic is deterministic vs hidden in vague AI
- whether the app is extensible into a real product

### 4. Data realism and integrity
Assess:
- what data is real vs mocked
- whether mocked data is clearly isolated
- whether calculations are internally consistent
- whether outputs are traceable to inputs
- whether assumptions are transparent

### 5. Financial / modelling review
Review the logic for:
- ADR / occupancy assumptions
- revenue calculation
- renovation cost model
- valuation uplift model
- 5-year projections
- forecast vs actual logic

Do not judge commercial realism only. Judge technical correctness, transparency, and coherence.

### 6. AI usage review
Determine:
- where AI is used
- whether AI is used appropriately
- whether any core numeric or financial logic has been inappropriately delegated to AI
- whether memo generation is grounded in deterministic inputs

### 7. UX / product review
Assess the user journey:
- can a user actually complete the intended flow?
- does the UI support the investment decision process?
- are important outputs understandable?
- what is missing to make the PoC convincing in a client demo?

### 8. Gap analysis
Separate into:
- critical gaps
- medium gaps
- minor gaps

### 9. Technical risk assessment
Identify:
- brittle areas
- fake or hardcoded behaviour disguised as real
- missing abstractions
- coupling problems
- likely blockers to productionisation

### 10. Refactor / next-step plan
Produce a concrete plan in priority order using:
- Phase 1: make PoC credible
- Phase 2: make architecture extensible
- Phase 3: move toward production

Cover:
- what must be fixed first
- what can remain mocked
- what should be redesigned
- what should be deferred

### 11. Final verdict
Choose one:
- `not aligned`
- `partially aligned`
- `mostly aligned`
- `strong PoC alignment`

Then justify the verdict.

## Repository Facts Already Observed

Use these as hypotheses to verify in the code, not as unquestioned truth.

### High-level conclusion to test

The repository appears to be a working full-stack PoC for STR deal screening, not a true full-lifecycle STR investment operating system. It seems partially aligned to the brief: coherent enough for screening demos, but materially short of the required lifecycle depth and modelling rigor.

### Likely strengths

- Working frontend and backend.
- Broad feature surface for a PoC.
- Deterministic core numeric logic instead of vague AI underwriting.
- Functional memo generation.
- Mock datasets across listings, comps, macro, bookings, accounting, and sales comps.

### Likely weaknesses to validate

- Financial model integrity is weak.
- Forecast-vs-actual compares but does not actually update assumptions.
- Renovation inference is heuristic keyword matching, not serious AI-assisted estimation.
- Valuation logic is crude.
- Provider / adapter abstraction is incomplete outside listing and STR sources.
- The app behaves more like an acquisition screener with attached mock post-acquisition views than a real lifecycle system.

## Specific Evidence To Verify

### Backend orchestration

- Main backend composition is in [backend/src/index.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/index.ts).
- It appears to expose routes for:
  - property search
  - analysis
  - ranking
  - macro data
  - renovation
  - valuation
  - financial model
  - memo
  - operations
  - accounting
  - forecast vs actual
  - portfolio

### Core deterministic analysis

- STR screening logic appears to be in [backend/src/analysis/analysisEngine.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/analysis/analysisEngine.ts).
- Check whether:
  - ADR is based on average market comps with bedroom/property-type adjustments
  - occupancy is average comp occupancy minus a vacancy buffer
  - revenue is annualised from a single normalized month
  - scoring is heuristic

### Renovation model

- Renovation logic appears to be in [backend/src/providers/renovationCostEngine.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/renovationCostEngine.ts).
- Check whether “AI-assisted inference” is actually just keyword matching over listing descriptions.
- Check whether manual renovation exists only as an API or also in the UI.

### Valuation model

- Valuation logic appears to be in [backend/src/providers/valuationEngine.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/valuationEngine.ts).
- Check whether comparable sale selection is limited to same city/state and broad square footage matching.
- Check whether comp selection ignores neighborhood, distance, recency weighting, and bed/bath similarity.

### Financial model

- Financial model logic appears to be in [backend/src/providers/financialModelEngine.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/financialModelEngine.ts).
- Verify whether:
  - debt financing exists despite docs implying otherwise
  - growth rates are hardcoded
  - refinance is modeled only as a displayed scenario, not fed back into later cashflows
  - IRR is not a real IRR calculation

### Forecast vs actual

- Forecast comparison appears to be in [backend/src/providers/forecastEngine.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/forecastEngine.ts).
- Verify whether:
  - the model compares predicted ADR / occupancy / annualised revenue to booking-derived actuals
  - actual revenue is annualised from tracked months
  - explanation text is heuristic, not model-based
  - assumptions are not actually updated or persisted

### Operations and accounting

- Operations data appears to come from [backend/src/providers/operationsDataProvider.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/operationsDataProvider.ts).
- Accounting appears to come from [backend/src/providers/accountingProvider.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/accountingProvider.ts).
- Check whether these are mocked and whether aggregation is technically coherent.

### AI usage

- AI summary service appears to be in [backend/src/ai/summary.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/ai/summary.ts).
- Memo generation appears to be in [backend/src/ai/memoGenerator.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/ai/memoGenerator.ts).
- Verify whether:
  - AI is optional
  - numerical logic is not delegated to AI
  - the memo is deterministic and grounded in analysis outputs

### Integration pattern

- Listing and STR providers appear abstracted in [backend/src/providers/interfaces.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/interfaces.ts).
- “Live” providers appear to be stubs in [backend/src/providers/liveProviders.ts](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/backend/src/providers/liveProviders.ts).
- Verify whether this abstraction does not extend consistently to macro, operations, accounting, or valuation data.

### Frontend product flow

- Landing/search flow appears to be in [frontend/app/page.tsx](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/frontend/app/page.tsx).
- Property workflow appears to be in [frontend/app/property/[id]/PropertyDetail.tsx](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/frontend/app/property/[id]/PropertyDetail.tsx).
- Portfolio view appears to be in [frontend/app/portfolio/page.tsx](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/frontend/app/portfolio/page.tsx).
- Forecast view appears to be in [frontend/app/forecast/page.tsx](/Users/jackbarrell/Library/Mobile%20Documents/com~apple~CloudDocs/Projects/ross_rent/frontend/app/forecast/page.tsx).
- Verify whether the UI supports a broad demo flow but is still tab-based and screening-oriented rather than lifecycle-oriented.

## Findings That Are Especially Important To Confirm Or Refute

1. The app likely supports acquisition screening well enough for a PoC, but does not yet support true lifecycle tracking.
2. Monthly seasonality and monthly revenue forecasting are likely missing.
3. Forecast-vs-actual likely stops at variance display and does not update the model.
4. Portfolio-level visibility likely exists, but is mostly a sum of screening outputs plus mocked accounting.
5. The memo is likely present and reasonably grounded, but only exports markdown, not PDF.
6. Documentation may be out of sync with implementation.
7. The repository may reference `.env.example` files in the README that do not actually exist.
8. There may be no tests.

## Expected Blunt Verdict

If the repository validates the above patterns, the likely verdict is:

`partially aligned`

Reason:
- credible acquisition-screening PoC
- coherent demo system
- insufficient modelling rigor and lifecycle depth for the full brief

Do not force this verdict if the code proves otherwise.
