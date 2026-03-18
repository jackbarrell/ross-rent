import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ComparableSale, PropertyListing, ValuationResult } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../../../data/comparable_sales.json");

let cache: ComparableSale[] | null = null;

function loadSales(): ComparableSale[] {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  }
  return cache!;
}

/**
 * Get comparable sales filtered by location, size, and bed/bath similarity.
 * Results are sorted by relevance score (recency + size + bed/bath match).
 */
export function getComparableSales(property: PropertyListing): ComparableSale[] {
  const all = loadSales();
  const candidates = all.filter((s) => {
    const sameCity = s.city.toLowerCase() === property.city.toLowerCase();
    const sameState = s.state.toLowerCase() === property.state.toLowerCase();
    const sizeFactor = Math.abs(s.sqft - property.sqft) / property.sqft;
    const bedDiff = Math.abs(s.bedrooms - property.bedrooms);
    const bathDiff = Math.abs(s.bathrooms - property.bathrooms);
    return sameCity && sameState && sizeFactor < 0.4 && bedDiff <= 1 && bathDiff <= 1;
  });

  // Score and sort by relevance: recency + size closeness + bed/bath match
  const now = Date.now();
  const scored = candidates.map((s) => {
    const daysSinceSale = (now - new Date(s.soldDate).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceSale / 730); // 2-year window
    const sizeScore = 1 - Math.abs(s.sqft - property.sqft) / property.sqft;
    const bedScore = s.bedrooms === property.bedrooms ? 1 : 0.5;
    const bathScore = s.bathrooms === property.bathrooms ? 1 : 0.5;
    const relevance = recencyScore * 0.3 + sizeScore * 0.3 + bedScore * 0.2 + bathScore * 0.2;
    return { sale: s, relevance };
  });
  scored.sort((a, b) => b.relevance - a.relevance);
  return scored.map((s) => s.sale);
}

/**
 * Estimate post-renovation value using comparable renovated sales.
 */
export function estimatePostRenovationValue(
  property: PropertyListing,
  renovationCost: number
): ValuationResult {
  const comps = getComparableSales(property);

  // Separate by quality level
  const renovatedComps = comps.filter((c) => c.qualityLevel === "renovated");
  const originalComps = comps.filter((c) => c.qualityLevel === "original");
  const allComps = renovatedComps.length > 0 ? renovatedComps : comps;

  // Calculate weighted average $/sqft for renovated comps (more recent = higher weight)
  const now = Date.now();
  let weightedSum = 0;
  let weightTotal = 0;
  for (const c of allComps) {
    const daysSince = (now - new Date(c.soldDate).getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.max(0.2, 1 - daysSince / 730);
    weightedSum += c.pricePerSqft * weight;
    weightTotal += weight;
  }
  const avgRenovatedPsf = weightTotal > 0 ? weightedSum / weightTotal
    : allComps.reduce((sum, c) => sum + c.pricePerSqft, 0) / Math.max(allComps.length, 1);

  // Estimate after value
  const afterValue = Math.round(avgRenovatedPsf * property.sqft);

  // Before value = list price (or average of original comps if available)
  const beforeValue =
    originalComps.length > 0
      ? Math.round(
          (originalComps.reduce((s, c) => s + c.pricePerSqft, 0) / originalComps.length) *
            property.sqft
        )
      : property.listPrice;

  const equityCreated = afterValue - beforeValue - renovationCost;

  return {
    propertyId: property.id,
    beforeValue,
    afterValue,
    renovationCost,
    equityCreated,
    comparablesUsed: comps,
    renovatedPricePerSqft: Math.round(avgRenovatedPsf),
    methodology: `Based on ${renovatedComps.length} renovated comparable sales in ${property.city}, ${property.state} ` +
      `(filtered by bed/bath ±1, sqft ±40%, recency-weighted). ` +
      `Weighted avg renovated $/sqft: $${Math.round(avgRenovatedPsf)}. Applied to ${property.sqft} sqft subject.`,
  };
}
