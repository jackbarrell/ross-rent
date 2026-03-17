# Architecture Summary

## PoC shape

- Frontend: Next.js dashboard
- Backend: Express + TypeScript
- Storage: SQLite (`backend/.local/ross_rent.sqlite`)
- Data: seeded mock fixtures in `data/`

## Core modules

1. `ListingDataProvider`
   - `MockListingProvider`: reads for-sale properties via SQLite
   - `LiveListingProvider`: stub for future MLS API integration

2. `ShortTermRentalDataProvider`
   - `MockShortTermRentalProvider`: reads rental comparables + assumptions
   - `LiveShortTermRentalProvider`: stub for future Airbnb/Vrbo data partners

3. `AnalysisEngine`
   - deterministic formulas for ADR, occupancy, gross revenue, costs, NOI, yield proxy, score

4. `AiSummaryService`
   - default: heuristic plain-English summary
   - optional: OpenAI response endpoint if API key is provided

## Request flow

1. User chooses location in frontend.
2. Frontend requests `/api/properties?location=...`.
3. User selects property.
4. Frontend requests `/api/analysis/:propertyId`.
5. Backend loads property + rental comps + assumptions.
6. `AnalysisEngine` computes metrics.
7. `AiSummaryService` generates concise memo.
8. Frontend renders market panel, financial panel, comparables, and summary.
