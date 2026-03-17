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
 * Get comparable sales filtered by location and rough size match.
 */
export function getComparableSales(property: PropertyListing): ComparableSale[] {
  const all = loadSales();
  return all.filter((s) => {
    const sameCity = s.city.toLowerCase() === property.city.toLowerCase();
    const sameState = s.state.toLowerCase() === property.state.toLowerCase();
    const sizeFactor = Math.abs(s.sqft - property.sqft) / property.sqft;
    return sameCity && sameState && sizeFactor < 0.5; // within 50% sqft
  });
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

  // Calculate average $/sqft for renovated comps
  const avgRenovatedPsf =
    allComps.reduce((sum, c) => sum + c.pricePerSqft, 0) / Math.max(allComps.length, 1);

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
    methodology: `Based on ${renovatedComps.length} renovated comparable sales in ${property.city}, ${property.state}. ` +
      `Average renovated $/sqft: $${Math.round(avgRenovatedPsf)}. Applied to ${property.sqft} sqft subject property.`,
  };
}
