import { Router } from "express";
import { ListingDataProvider, ShortTermRentalDataProvider } from "../providers/interfaces.js";
import { AnalysisEngine } from "../analysis/analysisEngine.js";
import { getPropertyIdsWithBookings } from "../providers/operationsDataProvider.js";
import { generateProperties, generateRentalComps, resolveState } from "../generators/marketGenerator.js";
import { marketExists, insertProperties, insertRentalComps, removeMarket } from "../db/sqlite.js";

export function createPropertyRouter(
  listingProvider: ListingDataProvider,
  strProvider: ShortTermRentalDataProvider,
  analysisEngine: AnalysisEngine,
) {
  const router = Router();

  router.get("/locations", async (_req, res, next) => {
    try {
      const locations = await listingProvider.getLocations();
      res.json({ locations });
    } catch (error) { next(error); }
  });

  router.get("/properties", async (req, res, next) => {
    try {
      const location = String(req.query.location ?? "");
      const properties = await listingProvider.searchProperties(location);
      res.json({ properties });
    } catch (error) { next(error); }
  });

  router.get("/properties/:id", async (req, res, next) => {
    try {
      const property = await listingProvider.getPropertyById(req.params.id);
      if (!property) { res.status(404).json({ message: "Property not found" }); return; }
      res.json({ property });
    } catch (error) { next(error); }
  });

  // Rank all properties — parallelized
  router.get("/ranking", async (req, res, next) => {
    try {
      const location = String(req.query.location ?? "");
      const properties = await listingProvider.searchProperties(location);

      const ranked = await Promise.all(
        properties.map(async (property) => {
          const locationKey = `${property.city},${property.state}`;
          const [comparables, assumptions] = await Promise.all([
            strProvider.getComparables(locationKey),
            strProvider.getAssumptions(locationKey),
          ]);
          const marketMetrics = analysisEngine.buildMarketMetrics(locationKey, comparables);
          const analysis = analysisEngine.analyseProperty({
            property, marketMetrics, rentalComparables: comparables, assumptions,
          });
          return {
            propertyId: property.id,
            address: property.address,
            city: property.city,
            state: property.state,
            listPrice: property.listPrice,
            propertyType: property.propertyType,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            attractivenessScore: analysis.attractivenessScore,
            yieldProxy: analysis.yieldProxy,
            estimatedAdr: analysis.estimatedAdr,
            estimatedMonthlyGrossRevenue: analysis.estimatedMonthlyGrossRevenue,
            estimatedNetOperatingIncome: analysis.estimatedNetOperatingIncome,
            confidence: analysis.confidence,
          };
        }),
      );

      ranked.sort((a, b) => b.attractivenessScore - a.attractivenessScore);
      res.json({ ranked });
    } catch (error) { next(error); }
  });

  // Portfolio — parallelized
  router.get("/portfolio", async (_req, res, next) => {
    try {
      const properties = await listingProvider.searchProperties("");
      const opsPropertyIds = new Set(getPropertyIdsWithBookings());

      const portfolioProperties = await Promise.all(
        properties.map(async (property) => {
          const locationKey = `${property.city},${property.state}`;
          const [comparables, assumptions] = await Promise.all([
            strProvider.getComparables(locationKey),
            strProvider.getAssumptions(locationKey),
          ]);
          const marketMetrics = analysisEngine.buildMarketMetrics(locationKey, comparables);
          const analysis = analysisEngine.analyseProperty({
            property, marketMetrics, rentalComparables: comparables, assumptions,
          });
          return {
            propertyId: property.id,
            address: property.address,
            city: property.city,
            state: property.state,
            listPrice: property.listPrice,
            estimatedRevenue: analysis.estimatedAnnualGrossRevenue,
            estimatedNoi: analysis.estimatedNetOperatingIncome,
            yieldProxy: analysis.yieldProxy,
            score: analysis.attractivenessScore,
            hasOperationsData: opsPropertyIds.has(property.id),
          };
        }),
      );

      const totalValue = portfolioProperties.reduce((s, p) => s + p.listPrice, 0);
      const totalRev = portfolioProperties.reduce((s, p) => s + p.estimatedRevenue, 0);
      const totalNoi = portfolioProperties.reduce((s, p) => s + p.estimatedNoi, 0);

      res.json({
        totalProperties: portfolioProperties.length,
        totalPortfolioValue: totalValue,
        totalEstimatedRevenue: Math.round(totalRev),
        totalEstimatedNoi: Math.round(totalNoi),
        averageYield: portfolioProperties.length > 0 ? Math.round((portfolioProperties.reduce((s, p) => s + p.yieldProxy, 0) / portfolioProperties.length) * 10000) / 10000 : 0,
        averageScore: portfolioProperties.length > 0 ? Math.round(portfolioProperties.reduce((s, p) => s + p.score, 0) / portfolioProperties.length * 10) / 10 : 0,
        properties: portfolioProperties,
      });
    } catch (error) { next(error); }
  });

  // ─── Add / Remove Market ──────────────────────────────────

  router.post("/markets", async (req, res, next) => {
    try {
      const rawCity = String(req.body.city ?? "").trim();
      let state = String(req.body.state ?? "").trim().toUpperCase();

      if (!rawCity) {
        res.status(400).json({ message: "City is required" });
        return;
      }

      // Reject street addresses passed as city names
      if (/\d/.test(rawCity)) {
        res.status(400).json({ message: `"${rawCity}" looks like a street address, not a city name. Please enter a city name (e.g., Morrisville).` });
        return;
      }

      // Auto-resolve state from city name if not provided
      if (!state) {
        const resolved = resolveState(rawCity);
        if (!resolved) {
          res.status(400).json({
            message: `Could not determine state for "${rawCity}". Please provide the state (e.g., FL, TX).`,
          });
          return;
        }
        state = resolved;
      }

      // Normalize city to title case (preserve internal caps like McDonald, DeWitt)
      const city = rawCity.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

      if (marketExists(city, state)) {
        res.status(409).json({ message: `${city}, ${state} is already being monitored` });
        return;
      }

      const properties = generateProperties(city, state);
      const rentalComps = generateRentalComps(city, state);

      insertProperties(properties);
      insertRentalComps(rentalComps);

      res.status(201).json({
        market: `${city},${state}`,
        properties,
        rentalComps: rentalComps.length,
      });
    } catch (error) { next(error); }
  });

  router.delete("/markets/:locationKey", async (req, res, next) => {
    try {
      const [city, state] = decodeURIComponent(req.params.locationKey).split(",").map(s => s.trim());
      if (!city || !state) {
        res.status(400).json({ message: "Location key must be in format City,State" });
        return;
      }
      const removed = removeMarket(city, state);
      if (removed === 0) {
        res.status(404).json({ message: `No market found for ${city}, ${state}` });
        return;
      }
      res.json({ message: `Removed ${city}, ${state}`, propertiesRemoved: removed });
    } catch (error) { next(error); }
  });

  return router;
}
