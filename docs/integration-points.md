# Integration Points for Real Data

## ListingDataProvider (MLS-style)

Replace `LiveListingProvider` with an integration to:
- RETS/RESO feed adapter
- brokerage aggregator API
- internal listings service

Expected responsibilities:
- map provider response to `PropertyListing`
- normalize addresses, property type, and bedroom/bath counts
- cache responses and enforce API quotas

## ShortTermRentalDataProvider (Airbnb/Vrbo-style)

Replace `LiveShortTermRentalProvider` with:
- approved STR market data API
- data warehouse tables from scraping/partners (where legally allowed)

Expected responsibilities:
- return area-level `RentalComparable[]`
- provide assumptions by location/regulatory zone
- expose data quality metadata for confidence scoring

## AI Layer

`AiSummaryService` already supports optional OpenAI usage.
In production:
- store prompts and outputs for auditability
- introduce guardrails/templates per market
- capture explainability fields and prompt versions
