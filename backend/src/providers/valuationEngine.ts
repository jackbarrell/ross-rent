import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ComparableSale, PropertyListing, ValuationResult } from "../models.js";
import { cachedFetch, TTL } from "./cache.js";

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

// ─── RentCast Comparable Sales API ─────────────────────────

interface RentCastSale {
  formattedAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  propertyType?: string;
  yearBuilt?: number;
  lotSize?: number;
  condition?: string;
}

export async function fetchLiveComparableSales(property: PropertyListing): Promise<ComparableSale[]> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `${property.city}_${property.state}_${property.bedrooms}`;

  return cachedFetch<ComparableSale[]>("rentcast-sales", cacheKey, TTL.RENTCAST, async () => {
    const params = new URLSearchParams({
      city: property.city,
      state: property.state,
      bedrooms: String(property.bedrooms),
      status: "Sold",
      limit: "20",
    });
    const res = await fetch(`https://api.rentcast.io/v1/listings/sale?${params}`, {
      headers: { "Accept": "application/json", "X-Api-Key": apiKey },
    });
    if (!res.ok) return [];
    const listings = (await res.json()) as RentCastSale[];

    return listings
      .filter((l) => l.lastSalePrice && l.squareFootage && l.lastSaleDate)
      .map((l, i) => ({
        id: `rc-sale-${i}`,
        address: l.formattedAddress ?? "",
        city: l.city ?? property.city,
        state: l.state ?? property.state,
        zip: l.zipCode ?? "",
        bedrooms: l.bedrooms ?? property.bedrooms,
        bathrooms: l.bathrooms ?? property.bathrooms,
        sqft: l.squareFootage!,
        soldPrice: l.lastSalePrice!,
        soldDate: l.lastSaleDate!,
        qualityLevel: inferQualityLevel(l) as "original" | "updated" | "renovated",
        pricePerSqft: Math.round(l.lastSalePrice! / l.squareFootage!),
      }));
  });
}

function inferQualityLevel(sale: RentCastSale): string {
  const yr = sale.yearBuilt ?? 1980;
  const saleYear = sale.lastSaleDate ? new Date(sale.lastSaleDate).getFullYear() : 2025;
  const age = saleYear - yr;
  if (age <= 5) return "renovated";
  if (age <= 15) return "updated";
  return "original";
}

/**
 * Get comparable sales filtered by location, size, and bed/bath similarity.
 * If useLive is true and RENTCAST_API_KEY is set, merges live sales from RentCast.
 * Results are sorted by relevance score (recency + size + bed/bath match).
 */
export function getComparableSales(property: PropertyListing, extraSales?: ComparableSale[]): ComparableSale[] {
  let all = loadSales();
  if (extraSales && extraSales.length > 0) {
    all = [...all, ...extraSales];
  }
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
  renovationCost: number,
  extraSales?: ComparableSale[]
): ValuationResult {
  const comps = getComparableSales(property, extraSales);

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
