import { AnalysisAssumptions, PropertyListing, RentalComparable } from "../models.js";
import { ListingDataProvider, ShortTermRentalDataProvider } from "./interfaces.js";

// ─── Shared helpers ────────────────────────────────────────

async function apiFetch<T>(url: string, apiKey: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers: { "Accept": "application/json", ...headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} from ${url}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function generateId(prefix: string, ...parts: string[]): string {
  const hash = parts.join("-").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `${prefix}-${hash}-${Date.now().toString(36).slice(-4)}`;
}

// Default seasonality curves per region type
const SEASONALITY_CURVES: Record<string, number[]> = {
  "TX": [0.85, 0.88, 1.25, 1.15, 1.10, 1.05, 0.95, 0.90, 0.92, 1.10, 1.00, 0.95],
  "TN": [0.75, 0.78, 0.90, 1.05, 1.15, 1.25, 1.20, 1.15, 1.10, 1.05, 0.82, 0.80],
  "AZ": [1.30, 1.35, 1.40, 1.15, 0.85, 0.65, 0.55, 0.60, 0.70, 0.90, 1.10, 1.25],
  "FL": [1.25, 1.30, 1.35, 1.10, 0.90, 0.75, 0.70, 0.70, 0.75, 0.85, 1.05, 1.20],
  "CO": [1.20, 1.15, 1.10, 0.85, 0.80, 1.15, 1.25, 1.20, 1.00, 0.90, 1.05, 1.15],
  "CA": [0.90, 0.92, 0.95, 1.00, 1.10, 1.20, 1.25, 1.25, 1.15, 1.05, 0.95, 0.88],
  "DEFAULT": [0.90, 0.90, 0.95, 1.00, 1.05, 1.10, 1.10, 1.10, 1.05, 1.00, 0.90, 0.85],
};

// ─── RentCast Listing Provider ─────────────────────────────
//
// RentCast API: https://developers.rentcast.io/reference
// Provides property listings, comparable sales, and market data.

interface RentCastListing {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  listPrice?: number;
  price?: number;
  daysOnMarket?: number;
  latitude?: number;
  longitude?: number;
  status?: string;
  listedDate?: string;
  lastSeen?: string;
}

export class LiveListingProvider implements ListingDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.rentcast.io/v1";
  // In-memory cache keyed by location → properties
  private cache = new Map<string, { data: PropertyListing[]; ts: number }>();
  private readonly cacheTtl = 15 * 60 * 1000; // 15 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.RENTCAST_API_KEY ?? "";
    if (!this.apiKey) throw new Error("RENTCAST_API_KEY is required for live listing provider");
  }

  async getLocations(): Promise<string[]> {
    // RentCast doesn't have a "list locations" endpoint.
    // Return currently cached locations + some defaults the app supports.
    const defaults = ["Austin,TX", "Nashville,TN", "Scottsdale,AZ"];
    const cached = [...this.cache.keys()];
    return [...new Set([...defaults, ...cached])];
  }

  async searchProperties(location: string): Promise<PropertyListing[]> {
    if (!location) return [];

    const cached = this.cache.get(location);
    if (cached && Date.now() - cached.ts < this.cacheTtl) return cached.data;

    const [city, state] = location.includes(",")
      ? location.split(",").map((s) => s.trim())
      : [location.trim(), ""];

    const params = new URLSearchParams({
      city,
      ...(state && { state }),
      status: "Active",
      propertyType: "Single Family,Condo,Townhouse",
      limit: "20",
    });

    const listings = await apiFetch<RentCastListing[]>(
      `${this.baseUrl}/listings/sale?${params}`,
      this.apiKey,
      { "X-Api-Key": this.apiKey }
    );

    const properties: PropertyListing[] = listings
      .filter((l) => l.listPrice && l.city && l.state)
      .map((l) => ({
        id: l.id ?? generateId("rc", l.addressLine1 ?? "", l.city ?? ""),
        address: l.formattedAddress ?? l.addressLine1 ?? "",
        city: l.city ?? city,
        state: l.state ?? state,
        zip: l.zipCode ?? "",
        bedrooms: l.bedrooms ?? 3,
        bathrooms: l.bathrooms ?? 2,
        sqft: l.squareFootage ?? 1500,
        listPrice: l.listPrice ?? l.price ?? 0,
        propertyType: normalizePropertyType(l.propertyType),
        daysOnMarket: l.daysOnMarket ?? 0,
        lat: l.latitude ?? 0,
        lng: l.longitude ?? 0,
      }));

    this.cache.set(location, { data: properties, ts: Date.now() });
    return properties;
  }

  async getPropertyById(id: string): Promise<PropertyListing | null> {
    // Search cached locations first
    for (const [, entry] of this.cache) {
      const found = entry.data.find((p) => p.id === id);
      if (found) return found;
    }

    // Try RentCast property detail endpoint
    try {
      const listing = await apiFetch<RentCastListing>(
        `${this.baseUrl}/properties?id=${encodeURIComponent(id)}`,
        this.apiKey,
        { "X-Api-Key": this.apiKey }
      );
      if (!listing || !listing.city) return null;
      return {
        id: listing.id ?? id,
        address: listing.formattedAddress ?? listing.addressLine1 ?? "",
        city: listing.city ?? "",
        state: listing.state ?? "",
        zip: listing.zipCode ?? "",
        bedrooms: listing.bedrooms ?? 3,
        bathrooms: listing.bathrooms ?? 2,
        sqft: listing.squareFootage ?? 1500,
        listPrice: listing.listPrice ?? listing.price ?? 0,
        propertyType: normalizePropertyType(listing.propertyType),
        daysOnMarket: listing.daysOnMarket ?? 0,
        lat: listing.latitude ?? 0,
        lng: listing.longitude ?? 0,
      };
    } catch {
      return null;
    }
  }
}

function normalizePropertyType(raw?: string): string {
  if (!raw) return "Single Family";
  const lower = raw.toLowerCase();
  if (lower.includes("condo")) return "Condo";
  if (lower.includes("town")) return "Townhome";
  if (lower.includes("multi")) return "Multi-Family";
  return "Single Family";
}

// ─── Mashvisor STR Provider ────────────────────────────────
//
// Mashvisor API: https://www.mashvisor.com/api
// Provides Airbnb/STR market analytics, rental comps, and occupancy data.

interface MashvisorProperty {
  id?: number;
  name?: string;
  address?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  night_price?: number;
  occupancy?: number;
  reviews_count?: number;
  distance?: number;
}

interface MashvisorMarketResponse {
  content?: {
    properties?: MashvisorProperty[];
    occupancy_rate?: number;
    avg_night_price?: number;
  };
}

export class LiveShortTermRentalProvider implements ShortTermRentalDataProvider {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.mashvisor.com/v1.1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.MASHVISOR_API_KEY ?? "";
    if (!this.apiKey) throw new Error("MASHVISOR_API_KEY is required for live STR provider");
  }

  async getComparables(locationKey: string): Promise<RentalComparable[]> {
    const [city, state] = locationKey.split(",").map((s) => s.trim());

    const params = new URLSearchParams({
      state: state,
      city: city,
      source: "airbnb",
      order_by: "night_price",
      items: "15",
    });

    try {
      const response = await apiFetch<MashvisorMarketResponse>(
        `${this.baseUrl}/client/airbnb-property/active-listings?${params}`,
        this.apiKey,
        { "x-api-key": this.apiKey }
      );

      const listings = response.content?.properties ?? [];
      return listings.map((l, i) => ({
        id: `mashv-${l.id ?? i}`,
        locationKey,
        source: "Airbnb" as const,
        name: l.name ?? `Listing ${i + 1}`,
        bedrooms: l.bedrooms ?? 2,
        bathrooms: l.bathrooms ?? 1,
        adr: l.night_price ?? 150,
        occupancyRate: (l.occupancy ?? 65) / 100,
        reviews: l.reviews_count ?? 0,
        distanceMiles: l.distance ?? 2,
        propertyType: normalizePropertyType(l.property_type),
      }));
    } catch (error) {
      console.warn(`Mashvisor API failed for ${locationKey}, returning empty comps:`, error);
      return [];
    }
  }

  async getAssumptions(locationKey: string): Promise<AnalysisAssumptions> {
    const [, state] = locationKey.split(",").map((s) => s.trim());
    const curve = SEASONALITY_CURVES[state] ?? SEASONALITY_CURVES["DEFAULT"];
    const avgSeason = curve.reduce((s, v) => s + v, 0) / 12;

    return {
      baseMonthlyDays: 30,
      vacancyBuffer: 0.03,
      managementFeeRate: 0.15,
      maintenanceRate: 0.08,
      utilitiesMonthly: 350,
      insuranceAnnual: 2100,
      taxRateAnnual: 0.012,
      suppliesMonthly: 140,
      platformFeeRate: 0.03,
      capitalReserveRate: 0.04,
      seasonalityIndex: Math.round(avgSeason * 100) / 100,
      monthlySeasonality: curve,
      riskNotes: [
        "Live market data — assumptions may need calibration",
        "Seasonality curve is regional default, not location-specific",
      ],
    };
  }
}

// ─── FRED + WalkScore live macro data ──────────────────────
//
// FRED API: https://fred.stlouisfed.org/docs/api/fred/
// WalkScore API: https://www.walkscore.com/professional/api.php

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations?: FredObservation[];
}

export async function fetchLiveMacroData(
  locationKey: string,
  lat?: number,
  lng?: number
): Promise<import("../models.js").MacroData | null> {
  const fredKey = process.env.FRED_API_KEY;
  const walkScoreKey = process.env.WALKSCORE_API_KEY;

  const [city, state] = locationKey.split(",").map((s) => s.trim());

  // State FIPS codes for FRED series
  const stateFips: Record<string, string> = {
    TX: "48", TN: "47", AZ: "04", FL: "12", CO: "08", CA: "06",
    NY: "36", GA: "13", NC: "37", SC: "45", NV: "32", OR: "41",
  };
  const fips = stateFips[state] ?? "";

  let unemploymentRate = 3.5;
  let homePriceAppreciation = 0.035;
  let medianHomePrice = 400000;

  // Fetch unemployment from FRED (state-level)
  if (fredKey && fips) {
    try {
      const unempSeries = `${state}UR`; // e.g. TXUR for Texas unemployment rate
      const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${unempSeries}&api_key=${encodeURIComponent(fredKey)}&file_type=json&sort_order=desc&limit=1`;
      const fredData = await apiFetch<FredResponse>(fredUrl, fredKey);
      const latestVal = fredData.observations?.[0]?.value;
      if (latestVal && latestVal !== ".") {
        unemploymentRate = parseFloat(latestVal);
      }
    } catch (e) {
      console.warn("FRED unemployment fetch failed:", e);
    }

    // ZHVI (Zillow Home Value Index) from FRED is available for some metros
    try {
      // Try FRED's median home price for the state
      const priceSeries = `MEDLISPRI${fips}`;
      const prUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${priceSeries}&api_key=${encodeURIComponent(fredKey)}&file_type=json&sort_order=desc&limit=2`;
      const prData = await apiFetch<FredResponse>(prUrl, fredKey);
      const obs = prData.observations?.filter((o) => o.value !== ".");
      if (obs && obs.length >= 1) {
        medianHomePrice = parseFloat(obs[0].value);
        if (obs.length >= 2) {
          const prev = parseFloat(obs[1].value);
          if (prev > 0) homePriceAppreciation = (medianHomePrice - prev) / prev;
        }
      }
    } catch {
      // Non-critical — use defaults
    }
  }

  // Fetch WalkScore
  let walkScore = 50;
  if (walkScoreKey && lat && lng) {
    try {
      const wsUrl = `https://api.walkscore.com/score?format=json&lat=${lat}&lon=${lng}&transit=1&bike=1&wsapikey=${encodeURIComponent(walkScoreKey)}`;
      const wsData = await apiFetch<{ walkscore?: number }>(wsUrl, walkScoreKey);
      walkScore = wsData.walkscore ?? 50;
    } catch {
      // Non-critical
    }
  }

  // Composite scores
  const economicTrendScore = Math.round(
    (Math.min(1, (6 - unemploymentRate) / 4) * 50 +
      Math.min(1, homePriceAppreciation / 0.08) * 50) * 10
  ) / 10;

  return {
    locationKey,
    populationGrowth: 0.015, // Would need Census API for real data
    gdpGrowthProxy: 0.025,
    tourismDemandIndex: 1.0,
    medianHomePrice: Math.round(medianHomePrice),
    homePriceAppreciation: Math.round(homePriceAppreciation * 1000) / 1000,
    unemploymentRate,
    crimeIndex: 35,
    walkScore,
    economicTrendScore,
    marketGrowthScore: Math.round(economicTrendScore * 0.8 * 10) / 10,
    notes: [
      fredKey ? "Unemployment data from FRED (Federal Reserve)" : "Using default unemployment estimate",
      walkScoreKey ? `WalkScore: ${walkScore}` : "WalkScore not available (no API key)",
      `Location: ${city}, ${state}`,
    ],
  };
}
