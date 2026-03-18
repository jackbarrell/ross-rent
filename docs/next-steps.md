# Fastest Route to Production

## Completed in PoC

- ✅ Connected live listing feed (RentCast) and STR market provider (Mashvisor).
- ✅ Added debt model (LTV, interest rate, DSCR, cash-on-cash, 5-year projections).
- ✅ Added scenario editor with assumption overrides and live recalculation.
- ✅ Added 7 FRED series, Census Bureau, WalkScore live integrations.
- ✅ Deal pipeline persisted to SQLite.
- ✅ Forecast calibration applies both ADR and vacancy adjustments.

## Next priorities

1. Add persistent historical snapshots (daily market data refresh).
2. Add zoning/permit/rule checks by address.
3. Add input validation (zod schemas on API routes).
4. Add basic test suite (unit tests for financial model, analysis, IRR).
5. Add auth, user projects, and shareable memos.
6. Add monitoring, error handling, and provider retry logic.
7. Add PDF export for investment memo.
8. Add map integration (Mapbox or Google Maps).
9. Extract routes from index.ts into route modules.
10. Shared type package between frontend and backend.
