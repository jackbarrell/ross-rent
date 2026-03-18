# Assumptions and Limitations

## Assumptions

- STR market quality can be approximated using local comparables.
- Revenue model:
  - Monthly gross = ADR × occupancy × seasonality factor × days/month
  - Annual gross = sum of 12 monthly revenue values
- Operating costs include both variable (management, maintenance, platform, reserves) and fixed (utilities, supplies, insurance, property tax) cost buckets.
- Yield proxy = NOI ÷ purchase price.
- ADR adjustments: +4% per bedroom above 3-bed baseline, property type multipliers (condo 0.95, townhome 0.98).
- Default financing: 75% LTV, 6.5% rate, 30-year term.
- Refinance modelled at year 3 with 75% LTV on appreciated value.
- Growth rates: revenue 3%, costs 2.5%, appreciation from macro data or 3.5% default.
- Scoring is a heuristic intended for screening, not underwriting.

## Limitations

- MLS and OTA data are mocked for PoC reliability (live API mode available with API keys).
- No permit/zoning compliance checks.
- Seasonality is 12 monthly factors per market — not daily or event-driven.
- No historical time-series backtesting.
- No user auth or multi-user collaboration.
- Some live macro values (GDP proxy, crime index) remain hardcoded placeholders.
- Renovation inference uses keyword heuristic, not ML/LLM.
- 30-day month simplification used in per-month revenue calculation.
- No PDF export for investment memo (markdown only).
