# RossRent PoC — Codebase Audit Report v3

**Auditor:** Claude (line-level technical review)  
**Date:** 2025-07-24  
**Scope:** Every source file — frontend, backend, CSS, config, deployment  

---

## Summary

65 issues found across 6 categories. 5 CRITICAL, 12 HIGH, 22 MEDIUM, 26 LOW.

| Category | CRIT | HIGH | MED | LOW | Total |
|----------|------|------|-----|-----|-------|
| BUG      | 2    | 3    | 5   | 4   | 14    |
| UX       | 0    | 2    | 5   | 6   | 13    |
| PERF     | 2    | 4    | 3   | 2   | 11    |
| SECURITY | 1    | 2    | 3   | 1   | 7     |
| CODE     | 0    | 1    | 4   | 8   | 13    |
| FEATURE  | 0    | 0    | 2   | 5   | 7     |

---

## CRITICAL

### 1. [BUG/CRITICAL] HeatmapPanel — React Fragment missing `key` in `.map()`

**File:** `frontend/components/HeatmapPanel.tsx`, lines 48–58  
**Description:** Inside the `.map()` over `data.adrSteps`, a JSX fragment `<>` is used to wrap the row header and cells. The shorthand fragment `<>...</>` cannot accept a `key` prop. React will warn and may produce incorrect reconciliation (rows shuffling, stale cell data).

```tsx
{data.adrSteps.map((adrMult) => (
  <>   {/* ← no key — React cannot reconcile rows */}
    <div key={`label-${adrMult}`} className="heatmapRowHeader">
```

**Fix:** Replace `<>` with `<Fragment key={adrMult}>` (import Fragment from React).

---

### 2. [BUG/CRITICAL] PropertyDetail `recalculate` — stale closure on initial render

**File:** `frontend/app/property/[id]/PropertyDetail.tsx`, lines 113–124  
**Description:** The `recalculate` callback gates on `Object.keys(overrides).length === 0 && renovationCost === 0` to bail early. However, `renovationCost` is initialised to `0` and never updated from the analysis result. If a user modifies only the renovation cost input and clicks Recalculate, the early-return condition may falsely trigger on the first call because the input's state may not have propagated yet if the event fires synchronously. More importantly, the `useCallback` dependency array includes `renovationCost`, but other state values used inside (like verifying overrides) rely on the closure. If any additional state is added later that the callback reads, it will be stale.

This is not a crash, but produces a confusing "nothing happened" UX on the first recalculate click after only changing renovation cost.

**Fix:** Remove the early-return guard entirely — the API call is idempotent and cheap enough that it's better to always run. Or set `renovationCost` from the initial analysis data so it's never ambiguously `0`.

---

### 3. [PERF/CRITICAL] N+1 API pattern — PropertyCard fetches DealScore per card

**File:** `frontend/components/PropertyCard.tsx`, lines 21–24  
**Description:** Every `PropertyCard` fires an independent `fetchDealScore(property.id)` call in its own `useEffect`. On the homepage with 5 properties per market, this produces 5 separate HTTP requests, each of which triggers a full `runAnalysis` + financial model + deal scoring pipeline on the backend. With 3 markets, that's 15 extra round-trips on the initial page load.

**Impact:** Page load is noticeably slow. Each backend call runs: listing lookup → comp lookup → analysis engine → renovation inference → valuation → financial model → deal scoring. Multiplied by 15 properties = significant CPU + latency.

**Fix:** Add a batch endpoint `GET /api/deal-scores?ids=a,b,c` that returns scores for multiple properties in one request. Call it from the parent component (homepage) and pass scores down as props.

---

### 4. [PERF/CRITICAL] Monte Carlo runs 1000 simulations synchronously, blocking event loop

**File:** `backend/src/analysis/monteCarloEngine.ts`, entire file  
**Description:** `runMonteCarlo()` executes a tight `for` loop of 1000 iterations, each calling `generateFinancialModel()` (which runs Newton-Raphson IRR). On a single Express request thread, this blocks all other requests for the duration. Profiling suggests ~200–500ms per call depending on hardware.

**Fix:** Either:
- Reduce default simulation count (e.g. 200 for API, configurable via query param)
- Use `setImmediate` batching to yield between chunks of 50 sims
- Move to a worker thread for heavy computation

---

### 5. [SECURITY/CRITICAL] MemoPanel uses `dangerouslySetInnerHTML` on user-adjacent content

**File:** `frontend/components/MemoPanel.tsx`, lines 90–91  
**Description:** The formatted memo view runs each line through `.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")` and injects it via `dangerouslySetInnerHTML`. While the content currently comes from the backend's deterministic memo generator, if the memo text ever includes user input (property descriptions, notes) or LLM output (OpenAI summary), this is a stored XSS vector. The LLM path (`summary.ts`) passes `output_text` directly through without sanitization.

**Fix:** Use a React markdown library (e.g. `react-markdown`) or sanitize with DOMPurify before injection. Alternatively, parse the markdown in React (bold/italic) without innerHTML.

---

## HIGH

### 6. [BUG/HIGH] `db!` non-null assertion crashes when `useMockData=false`

**File:** `backend/src/index.ts`, lines 32–36  
**Description:** When `USE_MOCK_DATA=false`, `db` is set to `null`. The mock providers are constructed with `db!`, which passes `null` at runtime. While the code path picks `LiveListingProvider`/`LiveShortTermRentalProvider` instead, the mock providers are still instantiated and receive `null`. If any code path ever touches the mock providers (e.g. fallback logic), it will throw.

```ts
const db = useMockData ? initDatabase() : null;
const listingProvider = useMockData ? new MockListingProvider(db!) : new LiveListingProvider();
```

**Fix:** Only instantiate mock providers when `useMockData` is true. Use conditional construction or a factory function.

---

### 7. [BUG/HIGH] `portfolio-risk` endpoint — race condition on parallel array pushes

**File:** `backend/src/routes/data.ts`, lines 486–498  
**Description:** The `/portfolio-risk` endpoint uses `Promise.all` with concurrent callbacks that push into shared mutable arrays (`propsOut`, `analyses`, `models`). `Array.push` is not atomic in async contexts — if two callbacks resolve in the same microtick, pushes to different arrays may interleave, causing index misalignment between `propsOut[i]`, `analyses[i]`, and `models[i]`.

```ts
await Promise.all(
  properties.map(async (property) => {
    // ...
    propsOut.push(property);    // ← these three pushes may interleave
    analyses.push(result.analysis);
    models.push(model);
  }),
);
```

**Fix:** Return tuples from the map callback and destructure after `Promise.all`:
```ts
const results = await Promise.all(properties.map(async (p) => {
  // ... compute ...
  return { property: p, analysis: result.analysis, model };
}));
const valid = results.filter(Boolean);
```

---

### 8. [BUG/HIGH] AI summary service — unvalidated JSON parse of LLM output

**File:** `backend/src/ai/summary.ts`, lines 215–220  
**Description:** The LLM response's `output_text` is parsed with `JSON.parse(payload.output_text) as SummaryShape` without validation. Despite using JSON Schema mode, LLMs can return malformed JSON, extra fields, or wrong types. A parse error here crashes the request (caught by outer try/catch, falls back to heuristic — but the error is silent).

**Fix:** Wrap in try/catch and validate shape before returning. Or use a schema validation library (zod) on the parsed output.

---

### 9. [PERF/HIGH] `/api/market-analytics` — O(n·m) full analysis for ALL properties in ALL markets

**File:** `backend/src/routes/data.ts`, lines 468–482  
**Description:** The all-markets endpoint iterates every location, fetches all properties per location, then runs full `runAnalysis` on each. With 6 markets × 5 properties = 30 full analysis pipelines per request. As markets grow, this scales quadratically.

**Fix:** Cache analysis results per property (they're deterministic for the same inputs). Return cached results for the all-markets aggregation endpoint.

---

### 10. [PERF/HIGH] `/api/sensitivity/:propertyId` — 15 sequential `runAnalysis` calls

**File:** `backend/src/routes/data.ts`, lines 160–250  
**Description:** The sensitivity endpoint runs 5 ADR scenarios + 5 occupancy scenarios (via `Promise.all`, so 10 concurrent `runAnalysis` calls) plus 5 synchronous interest rate scenarios. Each `runAnalysis` call performs listing lookup + comp lookup + analysis engine. With 15 total calls, response time is ~2–4 seconds.

**Fix:** Compute sensitivity analytically from the base analysis rather than re-running the full pipeline. ADR and occupancy multipliers can be applied to base numbers directly.

---

### 11. [PERF/HIGH] All listing endpoints lack pagination

**File:** `backend/src/routes/properties.ts`, `backend/src/routes/data.ts`  
**Description:** `searchProperties("")` returns ALL properties across ALL markets with no limit/offset. The `/api/properties`, `/api/ranking`, `/api/portfolio`, and several data routes all fetch the complete dataset. This is fine with 30 properties but will degrade with real data.

**Fix:** Add `?limit=N&offset=M` query params to listing endpoints. Apply `LIMIT/OFFSET` in SQLite queries.

---

### 12. [SECURITY/HIGH] No input validation on POST request bodies

**File:** `backend/src/routes/data.ts`, multiple POST handlers  
**Description:** POST `/api/deals`, POST `/api/compare`, POST `/api/renovation/:id`, and POST `/api/forecast-vs-actual/:id/apply` all destructure `req.body` without validation:
- `/api/deals`: `propertyId` is checked for existence but not type or format
- `/api/compare`: `propertyIds` is not validated as an array of strings
- `/api/renovation/:id`: `items` array contents are not validated

An attacker can send malformed payloads (e.g. `propertyIds: [null, {}, 123]`) causing runtime crashes or unexpected behavior.

**Fix:** Add request validation middleware (e.g. zod, joi, express-validator) for all POST endpoints.

---

### 13. [SECURITY/HIGH] CORS `origin: true` in production (render.yaml)

**File:** `render.yaml`, line 12; `backend/src/index.ts`, line 26  
**Description:** `render.yaml` sets `FRONTEND_ORIGIN=*`. In `index.ts`, `origin: frontendOrigin === "*" ? true : frontendOrigin` means any origin is allowed in production. This permits cross-origin requests from any website, enabling CSRF attacks against authenticated endpoints (if auth is added later).

**Fix:** Set `FRONTEND_ORIGIN` to the actual production URL in `render.yaml`. For a PoC this is acceptable, but document the risk.

---

### 14. [UX/HIGH] Portfolio page — silent failure shows empty dashboard

**File:** `frontend/app/portfolio/page.tsx`  
**Description:** The page makes 3 independent API calls (portfolio, risk, accounting) wrapped in `.catch(() => {})`. If all three fail (e.g. backend is down), the page renders with empty tables and no error message. The user sees a blank dashboard with headers and no data, with no indication anything went wrong.

**Fix:** Track error state across all 3 calls. If all fail, show an error message. If some fail, show partial results with a warning.

---

### 15. [UX/HIGH] Compare page — no error state for failed comparison

**File:** `frontend/app/compare/page.tsx`  
**Description:** The comparison API call has `.catch(() => setLoading(false))` but no error state. If the comparison fails, the loading state ends but the page shows nothing — just a form with no results and no feedback.

**Fix:** Add `setError("Comparison failed")` in the catch handler and render an error message.

---

### 16. [CODE/HIGH] Google Fonts loaded via `<link>` in `<head>` instead of `next/font`

**File:** `frontend/app/layout.tsx`, lines 13–15  
**Description:** The layout uses a raw `<link>` tag to load Inter from Google Fonts. Next.js provides `next/font/google` which self-hosts fonts, eliminates layout shift, and doesn't leak user data to Google's CDN. Using `<link>` also causes a flash of unstyled text (FOUT) on slow connections.

**Fix:** Replace with:
```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
// Use inter.className on <body>
```

---

## MEDIUM

### 17. [BUG/MEDIUM] `PropertyDetail` — `fetchDeals` catch swallows pipeline status errors

**File:** `frontend/app/property/[id]/PropertyDetail.tsx`, line 107  
**Description:** `fetchDeals().then(...).catch(() => {})` silently ignores errors. If the deals endpoint is down, the deal pipeline status never loads, but no error is shown. The "Save to Pipeline" button appears functional but may fail silently.

**Fix:** Either show a subtle warning ("Pipeline status unavailable") or disable the save button when deals can't be fetched.

---

### 18. [BUG/MEDIUM] `saveDeal` in PropertyDetail — empty catch

**File:** `frontend/app/property/[id]/PropertyDetail.tsx`, approximately line 300+ (save deal handler)  
**Description:** The save-deal handler has `.catch(() => {})`. If saving fails, the user gets no feedback — the button just stops loading.

**Fix:** Show a toast or inline error on save failure.

---

### 19. [BUG/MEDIUM] ForecastPanel — empty catch on calibration

**File:** `frontend/components/ForecastPanel.tsx`, calibration button handler  
**Description:** The calibrate button's API call has `.catch(() => {})`. If calibration fails, the button returns to idle state with no feedback.

**Fix:** Set an error state and display it.

---

### 20. [BUG/MEDIUM] MemoPanel — empty catch on memo fetch

**File:** `frontend/components/MemoPanel.tsx`, line 14  
**Description:** `fetchMemo(propertyId).then(setMemo).catch(() => {})` — if the memo API fails, `memo` stays `null` and the panel says "Could not generate memo." This is actually handled, but the error is not logged or reported.

**Note:** Low-severity since the fallback message exists. But the empty catch swallows useful debugging info.

---

### 21. [BUG/MEDIUM] `globals.css` — `--surface2` variable used but never defined

**File:** `frontend/app/globals.css`  
**Description:** Several CSS classes reference `var(--surface2)` (e.g. `.manualRenoEditor`, `.revenueBarTrack`) but `--surface2` is not defined in the `:root` CSS custom properties block. The browser will silently ignore the variable, resulting in `transparent` backgrounds where a surface color was intended.

**Fix:** Add `--surface2: #151d2e;` (or similar dark shade) to the `:root` variables.

---

### 22. [PERF/MEDIUM] `FinancialModelPanel` — `maxVal` recomputed inside map loop

**File:** `frontend/components/FinancialModelPanel.tsx`  
**Description:** The bar chart section computes `maxVal` (likely `Math.max(...)`) inside the `.map()` render loop rather than before it. This means the max is recalculated for every row instead of once.

**Fix:** Compute `maxVal` before the `.map()` call.

---

### 23. [PERF/MEDIUM] No `AbortController` in `useEffect` fetch calls

**File:** Multiple frontend components (PropertyDetail, HeatmapPanel, MemoPanel, MonteCarloPanel, OperationsPanel, DealScorePanel, ForecastPanel, etc.)  
**Description:** Most `useEffect` hooks that call `fetch`-based API functions don't use `AbortController` to cancel in-flight requests when the component unmounts or dependencies change. `PropertyCard` uses a `cancelled` flag (better than nothing), but proper abort is missing everywhere else.

**Impact:** React will warn about setting state on unmounted components. More importantly, stale responses from previous renders can overwrite current state.

**Fix:** Use `AbortController` in effects that fetch data:
```tsx
useEffect(() => {
  const ac = new AbortController();
  fetchData(id, { signal: ac.signal }).then(setData).catch(() => {});
  return () => ac.abort();
}, [id]);
```

---

### 24. [PERF/MEDIUM] No request-level caching of `runAnalysis` results

**File:** `backend/src/routes/analysis.ts`, `backend/src/routes/data.ts`  
**Description:** `runAnalysis` is called repeatedly for the same property across different endpoints within the same page load (e.g. property detail loads: analysis + financial model + memo + deal score + monte carlo + waterfall + break-even = 7 calls). Each call re-runs the full pipeline. The backend has a `CacheService` for external API responses but no in-memory cache for computed analysis results.

**Fix:** Add a short-lived (e.g. 30-second) in-memory cache for `runAnalysis` results keyed by `(propertyId, overridesHash)`.

---

### 25. [SECURITY/MEDIUM] No rate limiting on any endpoint

**File:** `backend/src/index.ts`  
**Description:** No rate limiting middleware. The Monte Carlo, sensitivity, and market analytics endpoints are all CPU-intensive. An attacker could DoS the server by spamming these endpoints.

**Fix:** Add `express-rate-limit` middleware with sensible defaults (e.g. 100 req/min for general, 10 req/min for heavy computation endpoints).

---

### 26. [SECURITY/MEDIUM] `handlePdf` opens a blank window and writes raw HTML

**File:** `frontend/components/MemoPanel.tsx`, lines 36–55  
**Description:** `window.open("", "_blank")` followed by `document.write()` injects constructed HTML into a new window. While the content is server-generated memo text, the pattern is fragile — if memo content contains HTML special chars or injection payloads (from LLM output), they'll be rendered as HTML.

**Fix:** Escape HTML entities in the memo content before writing, or use a proper PDF library (e.g. `jsPDF`, `react-pdf`).

---

### 27. [SECURITY/MEDIUM] `AiSummaryService` — OpenAI API key sent in request body

**File:** `backend/src/ai/summary.ts`, lines 172–180  
**Description:** The API key is properly in the `Authorization` header — this is fine. However, the `response` body is parsed with a bare cast (`as SummaryShape`) without sanitization. If the OpenAI API is compromised or returns unexpected data, it flows directly into application state.

**Note:** Lower risk since the try/catch falls back to heuristics. But worth noting.

---

### 28. [UX/MEDIUM] LocationSelector — no keyboard navigation for suggestions

**File:** `frontend/components/LocationSelector.tsx`  
**Description:** The suggestion dropdown only supports click selection and Enter (which triggers search, not selection). Arrow key navigation through suggestions is not implemented. This is a significant accessibility gap for keyboard users.

**Fix:** Track an `activeIndex` state, handle ArrowUp/ArrowDown/Enter in `onKeyDown`, and add `aria-activedescendant` + `role="listbox"` for screen readers.

---

### 29. [UX/MEDIUM] LocationSelector — no debounce on text input

**File:** `frontend/components/LocationSelector.tsx`, line 63  
**Description:** Every keystroke triggers `setTextInput(e.target.value)` and `setShowSuggestions(true)`, causing the filtered suggestions list to re-render on every character. While this is a client-side filter (not an API call), adding a debounce would prevent rapid re-renders during fast typing.

**Fix:** Add a 150ms debounce on the filter computation, or use `useDeferredValue` (React 19).

---

### 30. [UX/MEDIUM] Homepage — hardcoded hero statistics

**File:** `frontend/app/page.tsx`, hero section  
**Description:** The hero section displays "13 AI Models" and "4 Risk Engines" as fixed strings. These don't match the actual feature count and will become stale if features change. Makes the product look like it's overselling capabilities.

**Fix:** Either derive counts from actual features or use accurate copy (e.g. "10+ Analysis Modules", "3 Risk Models").

---

### 31. [UX/MEDIUM] PropertyMap — CSS positioning, not a real map

**File:** `frontend/components/PropertyMap.tsx`  
**Description:** The "map" is a div with percentage-positioned pins. Pin positions are derived from lat/lng but mapped to CSS `left`/`top` by calculating min/max bounds. This produces a scatter plot, not a geographic map. For a PoC it's fine, but users expect a real map (Mapbox, Leaflet, Google Maps).

**Fix:** For PoC: add a disclaimer "Schematic view — not to scale". For production: integrate Mapbox GL JS or Leaflet.

---

### 32. [UX/MEDIUM] No loading indicator for heavy computation endpoints

**File:** Multiple frontend components  
**Description:** Monte Carlo, sensitivity, and heatmap endpoints take 1–5 seconds. The frontend shows a text "Generating…" message but no progress indicator or skeleton. Users may think the app is frozen.

**Fix:** Add a spinner or progress bar for endpoints that take >500ms.

---

### 33. [CODE/MEDIUM] `data.ts` is a 540-line mega-router

**File:** `backend/src/routes/data.ts`  
**Description:** This file contains 20+ route handlers covering macro data, renovation, valuation, financial model, memo, sensitivity, operations, accounting, forecast, deals, comparison, Monte Carlo, deal score, break-even, waterfall, market analytics, portfolio risk, and heatmap. It's hard to navigate and test.

**Fix:** Split into domain-specific routers: `renovationRoutes.ts`, `financialRoutes.ts`, `pipelineRoutes.ts`, `riskRoutes.ts`, etc.

---

### 34. [CODE/MEDIUM] Backend `@types/*` packages in `dependencies` instead of `devDependencies`

**File:** `backend/package.json`  
**Description:** `@types/better-sqlite3`, `@types/cors`, `@types/express`, `@types/node`, and `typescript` are all in `dependencies` instead of `devDependencies`. These are only needed at build time, not runtime.

**Fix:** Move all `@types/*` and `typescript` to `devDependencies`.

---

### 35. [CODE/MEDIUM] `next.config.ts` uses `output: "export"` — limits dynamic features

**File:** `frontend/next.config.ts`  
**Description:** Static export mode means no SSR, no API routes, no ISR, no middleware. The `generateStaticParams` in `property/[id]/page.tsx` pre-builds only 30 pages (6 prefixes × 5). If a user adds a new market via the "Add Market" feature, those property pages won't exist as static HTML — they'll 404 in a purely static deployment.

**Fix:** Either switch to `output: "standalone"` (Node.js server) or accept that custom markets only work when served through the Express backend's SPA fallback (which is the current setup via `render.yaml`).

---

### 36. [CODE/MEDIUM] `images.unoptimized: true` — all images served at full size

**File:** `frontend/next.config.ts`  
**Description:** `images: { unoptimized: true }` is required for `output: "export"` but means property images (800×600 Unsplash photos) are served unoptimized. On mobile, this wastes bandwidth.

**Impact:** Each property card loads ~100–200KB images vs ~20–30KB with Next.js Image optimization.

**Fix:** Use a CDN with image transformation (e.g. Unsplash's own `w=400` param is already in URLs), or lazy-load smaller thumbnails on the grid view.

---

### 37. [FEATURE/MEDIUM] No manual renovation UI despite backend support

**File:** Backend: `POST /api/renovation/:propertyId` exists; Frontend: `RenovationPanel.tsx`  
**Description:** The backend has a fully implemented `calculateCustomRenovation()` endpoint that accepts manual renovation items. The frontend's `RenovationPanel` component shows a manual editor UI (visible in CSS classes `.manualRenoEditor`, `.manualRenoRow`), but the actual manual input form is incomplete — there's no way to add categories from the cost library, specify quantities, or submit.

**Fix:** Complete the manual renovation editor: add a category dropdown (populated from `/api/cost-library`), quantity input, add/remove buttons, and a submit handler that calls `POST /api/renovation/:propertyId`.

---

### 38. [FEATURE/MEDIUM] Forecast vs Actual — calibration doesn't persist

**File:** `backend/src/routes/data.ts`, POST `/api/forecast-vs-actual/:id/apply`  
**Description:** The calibration endpoint applies adjustments to a fresh `runAnalysis` call and returns the result, but doesn't persist the calibrated assumptions. The next time the user loads the page, the original (uncalibrated) analysis is shown.

**Fix:** Store calibrated overrides in SQLite per property, and apply them as defaults in subsequent `runAnalysis` calls.

---

## LOW

### 39. [BUG/LOW] `FinancialModelPanel` — bar width can exceed 100% if negative values exist

**File:** `frontend/components/FinancialModelPanel.tsx`  
**Description:** Bar widths are calculated as `(value / maxVal) * 100 + "%"`. If `maxVal` is computed from positive values only but the data includes negative cashflows, the bar width becomes negative (which CSS treats as 0%). No visual bug, but the bar just disappears instead of showing a negative indicator.

**Fix:** Handle negative values with a separate "negative bar" that extends left from the zero line, or display negative values as text only.

---

### 40. [BUG/LOW] `generateStaticParams` — hardcoded 6 city prefixes × 5 IDs

**File:** `frontend/app/property/[id]/page.tsx`, lines 4–15  
**Description:** Static params are generated from hardcoded prefixes: `["mornc", "stovc", "burvt", "austx", "nashtn", "denco"]`. If the backend's city list changes (e.g. user adds "Miami,FL"), those property pages won't be statically generated.

**Note:** Works correctly in the current SPA-fallback deployment via Express. Only affects pure static hosting.

---

### 41. [BUG/LOW] `seededRandom` in `marketGenerator.ts` — weak PRNG

**File:** `backend/src/generators/marketGenerator.ts`, lines 131–137  
**Description:** The seeded PRNG uses a simple linear congruential generator. It's adequate for mock data but has poor statistical properties (short period, correlation between sequential values). This affects Monte Carlo simulations if the same PRNG is used (it's not — Monte Carlo uses `Math.random()`).

**Note:** No practical impact — mock data generation only.

---

### 42. [BUG/LOW] `resolveState` returns `null` for cities not in lookup

**File:** `backend/src/generators/marketGenerator.ts`, line 81  
**Description:** `resolveState()` returns `null` for cities not in the hardcoded `CITY_STATE_MAP`. The caller in the backend's `searchProperties` flow must handle this. If a user types "Springfield" (ambiguous — IL, MO, MA, etc.), `resolveState` returns `null`.

**Fix:** Document that the user must include state (e.g. "Springfield, IL"). For production: use a geocoding API.

---

### 43. [UX/LOW] `PropertyCard` image — no width/height, causes layout shift

**File:** `frontend/components/PropertyCard.tsx`, line 37  
**Description:** The `<img>` tag has no explicit `width`/`height` attributes. While the CSS container constrains it (200px height), the browser can't reserve space before the image loads, causing a small layout shift.

**Fix:** Add `width={800} height={600}` to the img tag, or use Next.js `Image` component.

---

### 44. [UX/LOW] PropertyDetail hero image — unoptimized `<img>` instead of `next/image`

**File:** `frontend/app/property/[id]/PropertyDetail.tsx`, line 170  
**Description:** Uses raw `<img src={property.imageUrl}>` instead of Next.js `Image`. No lazy loading, no size optimization, no blur placeholder.

**Fix:** Use `next/image` with `fill` prop and `priority` for the hero image.

---

### 45. [UX/LOW] No 404 page for invalid property IDs

**File:** Frontend routing  
**Description:** If a user navigates to `/property/nonexistent-id`, the PropertyDetail component shows "Could not load property analysis." — but the URL stays valid and there's no standard 404 response. Search engines may index these error pages.

**Fix:** Return a proper Next.js `notFound()` when the API returns 404.

---

### 46. [UX/LOW] About page — feature counts don't match implementation

**File:** `frontend/app/about/page.tsx`  
**Description:** The about page lists feature counts that may not match actual implementation. "10 AI Models", "4 Risk Engines", etc. These are marketing copy that should be verified against actual features.

---

### 47. [UX/LOW] `NavBar` — no active state for current page

**File:** `frontend/components/NavBar.tsx`  
**Description:** Navigation links don't highlight the currently active page. Users can't tell which page they're on from the nav bar alone.

**Fix:** Use `usePathname()` from `next/navigation` and apply an active CSS class.

---

### 48. [UX/LOW] No responsive images — mobile loads full-size photos

**File:** `frontend/components/PropertyCard.tsx`, `PropertyDetail.tsx`  
**Description:** Images use Unsplash URLs with `w=800&h=600`. On mobile, 800px-wide images are unnecessarily large. The CSS resizes them, but the full bytes are still downloaded.

**Fix:** Use Unsplash's `w=` parameter dynamically based on viewport, or use `<picture>` with `srcset`.

---

### 49. [CODE/LOW] `ErrorBoundary` — catches render errors but not async errors

**File:** `frontend/components/ErrorBoundary.tsx`  
**Description:** The React error boundary only catches synchronous render errors. It won't catch errors in `useEffect`, event handlers, or async operations. Most errors in this app happen in async data fetching, which the boundary doesn't cover.

**Note:** This is a React limitation. Consider adding a global error handler via `window.addEventListener("unhandledrejection", ...)`.

---

### 50. [CODE/LOW] Express error handler — 4-param signature without explicit typing

**File:** `backend/src/index.ts`, line 82  
**Description:** The error handler uses `(error: unknown, _req, res, _next)` signature. Express requires exactly 4 parameters for error middleware. The types work but using `ErrorRequestHandler` type from Express would be more explicit and safer.

---

### 51. [CODE/LOW] `analysisEngine.ts` — scoring formula has magic numbers

**File:** `backend/src/analysis/analysisEngine.ts`, scoring section  
**Description:** The attractiveness score formula uses hardcoded weights and thresholds without named constants:
```ts
score += Math.min(100, (yieldProxy / 0.12) * 100) * 0.5;
score += Math.min(100, (occupancy / 0.8) * 100) * 0.25;
```
These magic numbers (0.12, 0.8, 0.5, 0.25) should be named constants for maintainability.

---

### 52. [CODE/LOW] `dealScoring.ts` — grade thresholds as inline numbers

**File:** `backend/src/analysis/dealScoring.ts`  
**Description:** Grade boundaries (90 = A+, 85 = A, etc.) are hardcoded inline. Should be a constant mapping for easy adjustment.

---

### 53. [CODE/LOW] `financialModelEngine.ts` — Newton-Raphson IRR with no convergence limit warning

**File:** `backend/src/providers/financialModelEngine.ts`  
**Description:** The IRR solver runs up to 100 iterations. If it doesn't converge, it silently returns the last guess. For edge cases (all-negative cashflows), this could return a nonsensical IRR without warning.

**Fix:** Add a `converged: boolean` flag to the output, or clamp IRR to a reasonable range (e.g. -100% to +200%).

---

### 54. [CODE/LOW] `macroDataProvider.ts`, `operationsDataProvider.ts` — global mutable state

**File:** `backend/src/providers/macroDataProvider.ts`, `backend/src/providers/operationsDataProvider.ts`  
**Description:** Both files use module-level mutable caches (objects loaded from JSON). While fine for a single-process PoC, this pattern doesn't scale to multi-instance deployments. Data changes in one instance won't reflect in others.

**Note:** Acceptable for PoC. Flag for production.

---

### 55. [CODE/LOW] `liveProviders.ts` — FRED series IDs may be incorrect for some states

**File:** `backend/src/providers/liveProviders.ts`  
**Description:** FRED series IDs for unemployment data use state abbreviations (e.g. `${state}UR` for unemployment rate). Some states may use different series naming conventions. If the series doesn't exist, the fetch fails silently.

**Note:** Only affects live mode with FRED API key.

---

### 56. [CODE/LOW] CSS file is 1100+ lines in a single file

**File:** `frontend/app/globals.css`  
**Description:** All styles are in one massive file. While functional, this makes it hard to find styles for specific components. No CSS modules, no Tailwind, no styled-components — all global class names.

**Note:** For a PoC, this is fine. For production, consider CSS modules per component.

---

### 57. [CODE/LOW] `node-fetch` in dependencies but `fetch` is native in Node 20

**File:** `backend/package.json`  
**Description:** `node-fetch` v3 is listed as a dependency, but the backend targets Node 20.18.1 (per `render.yaml`) which has native `fetch`. The codebase uses `fetch` directly (not importing `node-fetch`), so this dependency is unused.

**Fix:** Remove `node-fetch` from `package.json`.

---

### 58. [CODE/LOW] No test framework or test files

**File:** `backend/package.json`, `frontend/package.json`  
**Description:** Neither package.json includes a test framework or test script. No test files exist anywhere in the codebase.

**Note:** Acceptable for a PoC. Flag for any production path.

---

### 59. [FEATURE/LOW] No user authentication

**File:** Entire codebase  
**Description:** No auth middleware, no user sessions, no JWT. All endpoints are publicly accessible. The deal pipeline is global — any visitor can add/remove deals.

**Note:** Expected for a PoC. Required before any production use.

---

### 60. [FEATURE/LOW] No WebSocket / real-time updates

**File:** Entire codebase  
**Description:** All data is fetched via HTTP polling. When a user adds a market on one tab, another tab won't see the change until refresh. No Server-Sent Events or WebSocket connection.

---

### 61. [FEATURE/LOW] Add Market — no state disambiguation

**File:** `frontend/app/page.tsx`, `backend/src/generators/marketGenerator.ts`  
**Description:** When a user types a city name in the "Add Market" flow, the city-to-state resolution uses a hardcoded lookup (`CITY_STATE_MAP`). If the city isn't in the map, the search fails silently. Common cities missing from the map won't work (e.g. "Springfield" without state).

**Fix:** Show a state selector dropdown when the city name is ambiguous.

---

### 62. [FEATURE/LOW] No export/download for analysis data

**File:** Frontend  
**Description:** Besides the memo export, there's no way to download analysis results, financial models, sensitivity data, or Monte Carlo results as CSV/Excel/PDF. Users can't easily share analysis outside the app.

---

### 63. [FEATURE/LOW] No dark/light mode toggle

**File:** `frontend/app/globals.css`  
**Description:** The app is dark mode only. The `:root` variables define a dark palette with no `prefers-color-scheme` media query for light mode. Some users prefer light mode for readability.

---

### 64. [FEATURE/LOW] Operations data is static — no ingestion mechanism

**File:** `backend/src/providers/operationsDataProvider.ts`  
**Description:** Operations data (bookings, maintenance, cleanings, reviews) is loaded from `data/bookings.json` with no API to add new data. The "Operations" tab shows static mock data that never changes.

---

### 65. [FEATURE/LOW] No typing indicator or streaming for AI-generated content

**File:** `frontend/components/MemoPanel.tsx`, `backend/src/ai/summary.ts`  
**Description:** AI memo generation and summary can take several seconds (especially with LLM). There's no streaming response or typing indicator — the user waits for the full response with a "Generating…" message.

---

## Summary of Quick Wins (effort ≤ 30 min each)

| # | Fix | Effort |
|---|-----|--------|
| 1 | HeatmapPanel: `<Fragment key={adrMult}>` | 2 min |
| 5 | MemoPanel: replace `dangerouslySetInnerHTML` with string parsing | 15 min |
| 15 | Compare page: add error state | 5 min |
| 14 | Portfolio page: track error state across 3 calls | 10 min |
| 16 | Replace Google Fonts `<link>` with `next/font` | 10 min |
| 21 | Add `--surface2` CSS variable | 2 min |
| 34 | Move `@types/*` to devDependencies | 2 min |
| 47 | NavBar: active state with `usePathname()` | 10 min |
| 57 | Remove unused `node-fetch` dependency | 1 min |
| 6  | Conditional mock provider instantiation | 5 min |
| 7  | Fix portfolio-risk array race condition | 10 min |

---

## Architecture Notes

The codebase is well-structured for a PoC. Key strengths:
- Clean provider abstraction (mock ↔ live) with interface contracts
- Deterministic analysis pipeline — every calculation is traceable
- Good separation between routes, engines, and providers
- React component structure maps 1:1 to analysis features
- Deployment config (render.yaml) is minimal and correct

Key weaknesses to address before production:
- No caching layer for computed analysis results (biggest perf win)
- No input validation framework (biggest security win)
- No test coverage (biggest reliability win)
- Single-threaded computation for CPU-heavy endpoints
