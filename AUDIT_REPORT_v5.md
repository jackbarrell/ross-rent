# RossRent Audit Report v5

**Date:** 2025-01-XX
**Focus:** NEW issues only — not previously reported in audits v1–v4

---

## 1. Deal Score Yield Formula Always Maxes Out

**File:** `backend/src/analysis/dealScoring.ts` line 57–59
**Category:** Backend Correctness
**Severity:** HIGH

`yieldPct` is `analysis.yieldProxy * 100` (e.g. a 6% yield → `6`). The formula `yieldPct / 0.12 * 100` gives `6 / 0.12 * 100 = 5000`, which is clamped to 100. **Every property gets a perfect 100/100 yield score**, making the 20%-weighted category meaningless.

**Fix:**

```ts
// backend/src/analysis/dealScoring.ts line 58
// BEFORE:
const yieldScore = clamp(yieldPct / 0.12 * 100, 0, 100);

// AFTER (score 100 at 12% yield, linear below):
const yieldScore = clamp((yieldPct / 12) * 100, 0, 100);
```

---

## 2. Heuristic Verdict Bins Overlap — Scores 55–74 All Say "Promising"

**File:** `backend/src/ai/summary.ts` lines 41–45
**Category:** Backend Correctness
**Severity:** MEDIUM

Two separate branches both return `"Promising"`:

```ts
const verdict =
  analysis.attractivenessScore >= 75 ? "Promising"     // ← 75+ = Promising
    : analysis.attractivenessScore >= 55 ? "Promising"  // ← 55-74 ALSO = Promising
      : analysis.attractivenessScore >= 40 ? "Borderline"
        : "Caution";
```

This means there's no differentiation between a score of 76 and 56. The ≥75 case should be a stronger verdict.

**Fix:**

```ts
const verdict =
  analysis.attractivenessScore >= 75 ? "Strong Buy"
    : analysis.attractivenessScore >= 55 ? "Promising"
      : analysis.attractivenessScore >= 40 ? "Borderline"
        : "Caution";
```

Then add the corresponding CSS class:

```css
/* frontend/app/globals.css — after .verdictCaution */
.verdictStrong\ Buy { background: var(--green-bg); color: var(--green); border: 1px solid rgba(52,211,153,.3); box-shadow: 0 0 16px var(--green-glow); }
```

**Alternatively**, if you want to keep the three-tier verdict system, just change the first branch:

```ts
const verdict =
  analysis.attractivenessScore >= 75 ? "Promising"
    : analysis.attractivenessScore >= 55 ? "Borderline"
      : analysis.attractivenessScore >= 40 ? "Caution"
        : "Avoid";
```

And add `.verdictAvoid` CSS class. Either way the duplicate `"Promising"` must be resolved.

---

## 3. Score Badge Threshold Inconsistency Across Pages

**File:** Multiple frontend pages
**Category:** Data Display Bug
**Severity:** MEDIUM

The threshold for `scoreGood` (green badge) varies between pages:

| Page | scoreGood threshold | scoreMid threshold |
|---|---|---|
| `portfolio/page.tsx` line 119 | `>= 65` | `>= 45` |
| `page.tsx` line 297 | `>= 60` | `>= 45` |
| `markets/page.tsx` line 153, 185 | `>= 60` | `>= 45` |
| `components/MacroPanel.tsx` line 25 | `>= 80` | `>= 60` |

A property with a score of 62 shows green on the homepage but amber on the portfolio page. MacroPanel uses different thresholds entirely (since it's for a different metric, `marketGrowthScore`, this is acceptable).

**Fix:** Unify the threshold in `page.tsx`, `markets/page.tsx`, and `portfolio/page.tsx` to the same value:

```tsx
// portfolio/page.tsx line 119 — change 65 → 60 to match the others:
<span className={`scoreBadge ${p.score >= 60 ? "scoreGood" : p.score >= 45 ? "scoreMid" : "scoreLow"}`}>
```

---

## 4. PropertyCard N+1 — Fetches Deal Score for Every Card on Mount

**File:** `frontend/components/PropertyCard.tsx` lines 19–22
**Category:** UX / Performance
**Severity:** MEDIUM

Every `PropertyCard` fires an independent `fetchDealScore(property.id)` API call on mount. With 5 properties per market, this means 5 sequential API requests on the homepage, each requiring the backend to run the full analysis + financial model + deal scoring pipeline.

With multiple markets loaded, this balloons quickly. The homepage also fetches properties + ranking which already computes `attractivenessScore`, duplicating work.

**Fix (quick):** Pass the score from the parent to avoid the fetch. If a full deal score badge is needed, batch-fetch scores at the parent level:

```tsx
// page.tsx — fetch all deal scores in one batch after properties load
// Then pass score as prop to PropertyCard
export function PropertyCard({ property, score }: { property: PropertyListing; score?: DealScoreCard | null }) {
  // Remove the useEffect fetch, use the passed score prop instead
```

**Fix (API):** Add a batch endpoint `POST /api/deal-scores` that accepts an array of property IDs.

---

## 5. Monte Carlo Uses Hardcoded LTV/Rate Instead of Financial Model Assumptions

**File:** `backend/src/analysis/monteCarloEngine.ts` lines 128–131
**Category:** Backend Correctness
**Severity:** MEDIUM

The Monte Carlo engine hardcodes `ltv = 0.75` and `baseRate = 0.065` instead of using the financial model's actual `mortgageAssumptions.ltv` and `interestRate`. If a user adjusts these via scenario overrides, Monte Carlo results won't reflect the changes.

```ts
// Current hardcoded values:
const ltv = 0.75;
const baseRate = 0.065;
```

**Fix:** Accept mortgage assumptions as a parameter:

```ts
// In the function signature, add mortgageAssumptions parameter:
export function runMonteCarlo(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  renovationCost: number,
  macro: MacroData | null,
  config: Partial<MonteCarloConfig> = {},
  mortgageAssumptions?: { ltv: number; interestRate: number },
): MonteCarloResult {
  // ...
  const ltv = mortgageAssumptions?.ltv ?? 0.75;
  const baseRate = mortgageAssumptions?.interestRate ?? 0.065;
```

---

## 6. MacroPanel Displays Mortgage Rate Correctly Only by Coincidence

**File:** `frontend/components/MacroPanel.tsx` line 49
**Category:** Data Display Bug
**Severity:** LOW

```tsx
{data.mortgageRate30yr != null && <MetricCard label="30-yr Mortgage" value={fmtPct(data.mortgageRate30yr / 100)} />}
```

`fmtPct` multiplies by 100: `(n * 100).toFixed(1) + "%"`.

- Mock data: `mortgageRate30yr = 6.72` → `6.72 / 100 = 0.0672` → `fmtPct` → `"6.7%"` ✓
- Live FRED data: `mortgageRate30yr = 6.72` (same format) → also correct ✓

This works, but the `/100` then `*100` round-trip is fragile and confusing. If anyone stores the rate as a decimal (0.0672), this silently displays `"0.1%"`.

**Fix:** Use a direct format without the confusing double-conversion:

```tsx
{data.mortgageRate30yr != null && <MetricCard label="30-yr Mortgage" value={`${data.mortgageRate30yr.toFixed(1)}%`} />}
```

---

## 7. `render.yaml` Sets `FRONTEND_ORIGIN: "*"` — Wide-Open CORS in Production

**File:** `render.yaml` line 14
**Category:** Backend Correctness / Security
**Severity:** MEDIUM

```yaml
- key: FRONTEND_ORIGIN
  value: "*"
```

The Express CORS middleware uses this value. While acceptable for a PoC, this allows any website to make API requests to your backend. For production, this should be the actual frontend URL.

**Fix:**

```yaml
- key: FRONTEND_ORIGIN
  value: "https://ross-rent.onrender.com"
```

---

## 8. `img` Tags Without `width`/`height` Cause Layout Shift (CLS)

**File:** `frontend/components/PropertyCard.tsx` line 33
**Category:** Visual / CSS
**Severity:** LOW

```tsx
<img
  src={property.imageUrl}
  alt={property.address}
  className="cardImage"
  loading="lazy"
/>
```

Native `<img>` without `width`/`height` attributes causes Cumulative Layout Shift as images load. The card jumps in height when the lazy-loaded image appears.

Also applies to `frontend/app/property/[id]/PropertyDetail.tsx` hero image.

**Fix:** Add explicit dimensions (CSS already constrains them, but the attributes let the browser reserve space early):

```tsx
<img
  src={property.imageUrl}
  alt={property.address}
  className="cardImage"
  loading="lazy"
  width={800}
  height={600}
/>
```

Or better, use Next.js `<Image>` component which handles this automatically:

```tsx
import Image from "next/image";
// ...
<Image
  src={property.imageUrl}
  alt={property.address}
  className="cardImage"
  width={800}
  height={600}
  loading="lazy"
/>
```

---

## 9. Comparison Page Allows Selecting Fewer Than 2 Properties and Submitting

**File:** `frontend/app/compare/page.tsx`
**Category:** UX Gap
**Severity:** LOW

The compare button is only disabled while loading, not when fewer than 2 properties are selected. Users can click "Compare" with 0 or 1 selections, triggering an API call that returns meaningless data (a single-row comparison table).

**Fix:** Disable the button when `selected.length < 2`:

```tsx
<button
  className="btnPrimary"
  disabled={loading || selected.length < 2}
  onClick={handleCompare}
>
  Compare ({selected.length})
</button>
```

---

## 10. Financial Model Panel Bar Chart Has No Y-Axis Scale Reference

**File:** `frontend/components/FinancialModelPanel.tsx`
**Category:** UX Gap
**Severity:** LOW

The equity/cashflow bar chart renders colored bars but provides no axis labels, gridlines, or scale indicators. Users cannot tell the magnitude of bars at a glance — they must hover or read the adjacent numbers.

**Fix:** Add a simple min/max label or use a max-value reference line. Even just showing the dollar value at the end of each bar (already done for some bars) consistently would help.

---

## 11. `generateStaticParams` Hardcodes 6 City Prefixes — Stale After Market Addition

**File:** `frontend/app/property/[id]/page.tsx`
**Category:** Missing Functionality
**Severity:** LOW

```ts
export function generateStaticParams() {
  const prefixes = ["mor", "aus", "nas", "sco", "den", "tam"];
  return prefixes.flatMap((p, pi) =>
    Array.from({ length: 5 }, (_, i) => ({ id: `prop-${p}${["vt","tx","tn","az","co","fl"][pi]}-${String(i+1).padStart(3,"0")}` }))
  );
}
```

When a user adds a new market (e.g., "Miami, FL"), those property IDs won't be in `generateStaticParams`. In static export mode (`output: "export"`), those pages would 404. In server mode the fallback works, but this is a latent issue if static export is ever used.

**Fix:** Either fetch the actual property IDs from the backend at build time, or set `dynamicParams = true` (default in Next.js 15 app router).

---

## 12. Cash-on-Cash in Monte Carlo Calculated from Wrong Year

**File:** `backend/src/analysis/monteCarloEngine.ts` line 158
**Category:** Backend Correctness
**Severity:** LOW

```ts
const coc = totalEquityIn > 0 ? (cashflows[1]) / totalEquityIn : 0;
```

`cashflows[1]` is Year 1 net cashflow (revenue - costs - debt service), which is correct for cash-on-cash. However, this value is the pre-growth Year 1 cash flow. The actual Monte Carlo varies ADR/occupancy but then compounds at `1 + 0.03` starting from year 1: `rev = simAnnualRevenue * Math.pow(1 + 0.03, y - 1)` — so Year 1 (`y=1`) gets multiplier `1.0` (no growth), which is correct.

**No fix needed** — this is actually correct upon closer inspection. Noting for documentation only.

---

## 13. Pipeline Page Status Buttons Don't Show Loading State

**File:** `frontend/app/pipeline/page.tsx`
**Category:** UX Gap
**Severity:** LOW

When changing a deal's status via the `<select>` dropdown, there's no loading indicator. The optimistic update immediately changes the UI, but if the API call fails, the silent rollback is confusing — the card just jumps back to its previous column without explanation.

**Fix:** Add a brief toast or inline error message on rollback:

```tsx
.catch(() => {
  setDeals(prev); // rollback
  alert("Failed to update status — please try again.");
})
```

---

## 14. `allocationBreakdown` Percentage Width Can Exceed 100% Due to Rounding

**File:** `frontend/app/portfolio/page.tsx` around line 192
**Category:** Visual / CSS
**Severity:** LOW

```tsx
<div key={s.label} className="allocationSeg" style={{ width: `${s.percentage * 100}%` }} />
```

If the backend returns percentages that sum to slightly more than 1.0 due to floating point, the segments overflow the container. The CSS `overflow: hidden` on `.allocationBar` clips it, but segments may be visually truncated.

**Fix:** Normalize percentages on the frontend before rendering:

```tsx
const totalPct = risk.allocationBreakdown.reduce((s, a) => s + a.percentage, 0);
// In the JSX:
style={{ width: `${(s.percentage / totalPct) * 100}%` }}
```

---

## 15. `SensitivityPanel` Missing Base-Case Highlight When Label Doesn't Contain "Base"

**File:** `frontend/components/SensitivityPanel.tsx` line 47
**Category:** Data Display Bug
**Severity:** LOW

```tsx
const isBase = s.label === "Base" || s.label.includes("Base");
```

The base case detection relies on the backend putting "Base" in the scenario label. If the label format changes (e.g., "Current", "0%", "Baseline"), the highlight breaks silently. This is fragile string matching.

**Fix:** Use the index-based approach or add a `isBase` boolean flag to `SensitivityResult.scenarios`:

```tsx
// Quick fix — highlight the middle scenario as base:
const midIdx = Math.floor(r.scenarios.length / 2);
// In the map:
const isBase = i === midIdx;
```

---

## 16. Risk Factor Items All Use `riskFactorMedium` Class Regardless of Severity

**File:** `frontend/app/portfolio/page.tsx` around line 210
**Category:** Visual / CSS
**Severity:** LOW

```tsx
<div key={i} className="riskFactorItem riskFactorMedium">
```

All risk factors are hardcoded to `riskFactorMedium` (yellow styling). The CSS defines `riskFactorHigh` (red) and `riskFactorLow` (green) classes that are never used. All risk items look identical regardless of actual severity.

**Fix:** Assign severity based on risk factor content or add a severity field to the backend response:

```tsx
// Simple heuristic based on keywords:
const severity = f.toLowerCase().includes("high") || f.includes("⚠")
  ? "riskFactorHigh"
  : f.toLowerCase().includes("low") || f.toLowerCase().includes("stable")
    ? "riskFactorLow"
    : "riskFactorMedium";

<div key={i} className={`riskFactorItem ${severity}`}>
```

---

## Summary Table

| # | Category | Severity | File | Description |
|---|----------|----------|------|-------------|
| 1 | Backend Correctness | **HIGH** | `dealScoring.ts:58` | Yield score formula always maxes to 100 |
| 2 | Backend Correctness | MEDIUM | `summary.ts:41` | Duplicate "Promising" verdict for scores 55–100 |
| 3 | Data Display | MEDIUM | Multiple pages | Score badge green threshold inconsistent (60 vs 65) |
| 4 | UX / Performance | MEDIUM | `PropertyCard.tsx:19` | N+1: every card fetches deal score independently |
| 5 | Backend Correctness | MEDIUM | `monteCarloEngine.ts:128` | Hardcoded LTV/rate ignores user overrides |
| 6 | Data Display | LOW | `MacroPanel.tsx:49` | Fragile `/100 * 100` mortgage rate formatting |
| 7 | Security | MEDIUM | `render.yaml:14` | CORS `*` in production config |
| 8 | Visual / CSS | LOW | `PropertyCard.tsx:33` | `<img>` without dimensions → CLS |
| 9 | UX Gap | LOW | `compare/page.tsx` | Compare button enabled with <2 selections |
| 10 | UX Gap | LOW | `FinancialModelPanel.tsx` | Bar chart has no scale reference |
| 11 | Missing Functionality | LOW | `property/[id]/page.tsx` | `generateStaticParams` hardcoded, stale after add market |
| 13 | UX Gap | LOW | `pipeline/page.tsx` | No loading/error feedback on status change |
| 14 | Visual / CSS | LOW | `portfolio/page.tsx:192` | Allocation bar can overflow 100% |
| 15 | Data Display | LOW | `SensitivityPanel.tsx:47` | Base-case highlight relies on fragile string match |
| 16 | Visual / CSS | LOW | `portfolio/page.tsx:210` | All risk factors use medium styling regardless |
