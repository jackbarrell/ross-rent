# RossRent PoC — Codebase Audit Report v4

**Auditor:** Claude (line-level technical review)  
**Date:** 2025-07-25  
**Scope:** Every source file — frontend, backend, CSS, config, data  
**Note:** This report covers only NEW issues not present in AUDIT_REPORT_v3.md.

---

## Summary

12 new issues found across 5 categories. 0 CRITICAL, 2 HIGH, 7 MEDIUM, 3 LOW.

| Category | HIGH | MED | LOW | Total |
|----------|------|-----|-----|-------|
| BUG      | 2    | 0   | 0   | 2     |
| CSS      | 0    | 5   | 1   | 6     |
| UX       | 0    | 1   | 1   | 2     |
| PERF     | 0    | 1   | 0   | 1     |
| DATA     | 0    | 0   | 1   | 1     |

---

## HIGH

### 1. [BUG/HIGH] CPI Inflation Rate displays "0.0%" — double division by 100

**File:** `frontend/components/MacroPanel.tsx`, line 47  
**Description:** `cpiInflationRate` is stored as a decimal fraction (e.g. `0.031` = 3.1%) in both mock data and live providers. The `fmtPct` helper already multiplies by 100 (`(n * 100).toFixed(1) + "%"`), but the MacroPanel also divides by 100 before passing to `fmtPct`:

```tsx
{data.cpiInflationRate != null && <MetricCard label="CPI Inflation" value={fmtPct(data.cpiInflationRate / 100)} />}
```

Result: `0.031 / 100 = 0.00031` → `fmtPct(0.00031)` → `"0.0%"` instead of `"3.1%"`.

The same applies to `buildingPermitGrowth` if it were also divided (it isn't — `fmtPct(data.buildingPermitGrowth)` is correct). The inconsistency is that `mortgageRate30yr` IS stored as a percentage (6.72) so dividing by 100 makes sense for it, but `cpiInflationRate` uses a different unit convention.

**Fix:** Remove the `/ 100`:
```tsx
<MetricCard label="CPI Inflation" value={fmtPct(data.cpiInflationRate)} />
```

---

### 2. [BUG/HIGH] Unemployment Rate displays "350%" when using live FRED data

**File:** `backend/src/providers/liveProviders.ts`, ~line 313 + `frontend/components/MacroPanel.tsx`, line 42  
**Description:** The mock data stores `unemploymentRate` as a decimal fraction (`0.032` = 3.2%), but the live FRED provider parses the raw FRED value directly:

```ts
// liveProviders.ts — FRED returns "3.5" as a percentage
const vals = await fetchFredSeries(`${state}UR`);
if (vals.length > 0) { unemploymentRate = parseFloat(vals[0]); }
// → unemploymentRate = 3.5
```

The frontend calls `fmtPct(data.unemploymentRate)` which multiplies by 100:
- Mock: `fmtPct(0.032)` → `"3.2%"` ✓
- Live: `fmtPct(3.5)` → `"350.0%"` ✗

This also affects the `economicTrendScore` calculation in `buildMacroResult`, where `(6 - unemploymentRate) / 4` assumes percentage format. With mock's decimal `0.032`, this yields `(6 - 0.032) / 4 ≈ 1.49` → clamped to 1.0 (perfect score), which inflates mock scores.

**Fix:** Normalize the live value to match mock convention, or vice versa. Recommended: store everything as decimals and convert FRED values on ingestion:
```ts
unemploymentRate = parseFloat(vals[0]) / 100; // 3.5 → 0.035
```
Then update `buildMacroResult`'s score formula to use decimal format:
```ts
Math.min(1, (0.06 - unemploymentRate) / 0.04) * 30
```

---

## MEDIUM

### 3. [CSS/MEDIUM] `--blue` CSS variable used but never defined

**Files:** `frontend/app/pipeline/page.tsx` line 13, `frontend/app/globals.css` line 1484  
**Description:** Two usages reference `var(--blue)` but no `--blue` custom property exists in `:root`:
1. Pipeline status color for "watching" deals → badges render with no visible color
2. `.waterfallSubtotal .waterfallBarFill` → waterfall subtotal bars have no fill  

**Fix:** Add to `:root` in globals.css:
```css
--blue: #60a5fa;
```

---

### 4. [CSS/MEDIUM] `--card` CSS variable used but never defined

**File:** `frontend/app/globals.css`, line 1557  
**Description:** `.marketCard` uses `background: var(--card)` but `--card` is not defined in `:root`. Market cards on the Markets Intelligence page render with transparent/no background, making text float over the page background.

**Fix:** Add to `:root`:
```css
--card: #111827;
```

---

### 5. [CSS/MEDIUM] `--fg` CSS variable used but never defined

**File:** `frontend/app/globals.css`, line 991  
**Description:** `.revenueBarValue` uses `color: var(--fg)` but `--fg` is not defined. Revenue chart dollar values have no text color — they may inherit from a parent or be invisible depending on the cascade.

**Fix:** Add to `:root`:
```css
--fg: #e8ecf4;
```

---

### 6. [CSS/MEDIUM] `--text-primary` CSS variable used but never defined

**File:** `frontend/app/globals.css`, line 641  
**Description:** `.emptyStateTitle` uses `color: var(--text-primary)` but only `--text` exists in `:root`. The "No properties in..." and "Search for a market" headings on the homepage empty state have no visible text color.

**Fix:** Add to `:root`:
```css
--text-primary: #e8ecf4;
```
Or change the rule to use the existing `var(--text)`.

---

### 7. [CSS/MEDIUM] `--text-muted` CSS variable used but never defined

**File:** `frontend/app/globals.css`, line 386  
**Description:** `.heroImageFallbackText` uses `color: var(--text-muted)` but only `--muted` exists in `:root`. The "No image available" text on property hero images is invisible.

**Fix:** Change to `var(--muted)` or add `--text-muted: #64748b;` to `:root`.

---

### 8. [UX/MEDIUM] Deal pipeline status cycling is unintuitive

**File:** `frontend/app/property/[id]/PropertyDetail.tsx`, lines 213–218  
**Description:** The pipeline button on property detail pages cycles through statuses in a fixed order:

```
watching → analyzing → under-offer → watching (loops back)
```

Problems:
- Users can't skip statuses or go backwards
- "purchased" and "passed" are defined in `STATUS_OPTIONS` (pipeline page) but unreachable from the property detail button
- After "under-offer" it loops back to "watching" instead of progressing to "purchased"
- Single-click status change with no confirmation makes accidental changes easy

**Fix:** Replace the cycling button with a `<select>` dropdown showing all 5 statuses, or add a small dropdown menu next to the button.

---

### 9. [PERF/MEDIUM] Forecast page fires N parallel API calls (one per property)

**File:** `frontend/app/forecast/page.tsx`, lines 33–43  
**Description:** The page first fetches ALL properties, then fires individual `fetchForecastVsActual(property.id)` calls for every property via `Promise.all`. With 30+ properties (6 markets × 5), this creates 30+ simultaneous HTTP requests. Each backend call runs `runAnalysis` + forecast comparison, resulting in significant server load.

```tsx
const forecasts = await Promise.all(
  properties.map(async (property) => {
    const forecast = await fetchForecastVsActual(property.id);
    ...
  })
);
```

**Fix:** Add a batch endpoint `GET /api/forecast-vs-actual` that returns all properties with forecast data in a single request. Or limit the initial fetch to properties that have operations data (add a filter endpoint).

---

## LOW

### 10. [CSS/LOW] `.phaseHeading` has duplicate `font-size` — likely typo

**File:** `frontend/app/globals.css`, lines 877–883  
**Description:** The rule declares `font-size` twice. The second value silently overrides the first:

```css
.phaseHeading {
  font-size: 1.15rem;   /* ← declared first */
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.02em;
  margin: 8px 0 14px;
  text-transform: uppercase;
  font-size: 0.85rem;   /* ← overrides — intentional? */
}
```

The heading is used on the About page for phase titles. `0.85rem` seems small for a heading; `1.15rem` was likely the intended size.

**Fix:** Remove the duplicate. Keep whichever size is intended.

---

### 11. [UX/LOW] Scenario editor inputs show current values as placeholder, not default

**File:** `frontend/app/property/[id]/PropertyDetail.tsx`, lines 395–402  
**Description:** The scenario editor inputs display current assumption values via `placeholder` attribute:

```tsx
<input type="number" placeholder={String((a.assumptions.managementFeeRate * 100).toFixed(0))} ... />
```

Once a user clicks into any field, the placeholder disappears and there's no way to see the original value. If a user clears a field, it shows empty with no reference to the default. The `onChange` handler fires with `0` for empty fields (`Number("") || 0`), silently setting assumption overrides to zero.

**Fix:** Use `defaultValue` instead of `placeholder`, or show the current value as a label adjacent to each input. Add validation to ignore empty/zero inputs as "no override".

---

### 12. [DATA/LOW] Inconsistent unit conventions across macro data fields

**File:** `data/macro_data.json`, `backend/src/providers/liveProviders.ts`  
**Description:** Macro data fields use inconsistent unit conventions:

| Field | Mock format | Live FRED format | Frontend display |
|-------|------------|-----------------|-----------------|
| `unemploymentRate` | 0.032 (decimal) | 3.5 (percentage) | `fmtPct()` — ×100 |
| `mortgageRate30yr` | 6.72 (percentage) | 6.72 (percentage) | `fmtPct(n/100)` — ÷100 then ×100 |
| `cpiInflationRate` | 0.031 (decimal) | 0.031 (decimal) | `fmtPct(n/100)` — ÷100 then ×100 ❌ |
| `homePriceAppreciation` | 0.035 (decimal) | 0.035 (decimal) | `fmtPct()` — ×100 ✓ |
| `populationGrowth` | 0.028 (decimal) | 0.015 (decimal) | `fmtPct()` — ×100 ✓ |

The mix of "stored as percentage" (`mortgageRate30yr`) vs "stored as decimal" (everything else) creates confusion and the bugs in issues #1 and #2.

**Fix:** Standardize on one convention. Recommended: store all rates as decimals (0.0672 for 6.72% mortgage), then use `fmtPct()` uniformly without `/ 100` anywhere.

---

## Fix Priority

**All fixes below have been applied in this commit:**

| # | Issue | File(s) changed |
|---|-------|----------------|
| 1 | CPI Inflation "0.0%" | `frontend/components/MacroPanel.tsx` — removed `/ 100` |
| 2 | Unemployment "350%" in live mode | `backend/src/providers/liveProviders.ts` — normalize FRED value to decimal, updated default + formula |
| 3–7 | 5 missing CSS variables | `frontend/app/globals.css` — added `--blue`, `--fg`, `--card`, `--text-primary`, `--text-muted` to `:root` |
| 8 | Pipeline status cycling | `frontend/app/property/[id]/PropertyDetail.tsx` — replaced cycling button with `<select>` dropdown |
| 10 | Duplicate `font-size` | `frontend/app/globals.css` — removed duplicate declaration in `.phaseHeading` |
| 11 | Scenario editor placeholders | `frontend/app/property/[id]/PropertyDetail.tsx` — changed `placeholder` to `defaultValue` |

**Not fixed (requires new backend endpoint):**

| # | Issue | Reason |
|---|-------|--------|
| 9 | Forecast N+1 API calls | Needs a new batch endpoint — architectural change |
| 12 | Unit convention inconsistency | Documented; core fields fixed via issue #2 |
