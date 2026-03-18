import { Router } from "express";
import { ListingDataProvider, ShortTermRentalDataProvider } from "../providers/interfaces.js";
import { AnalysisEngine } from "../analysis/analysisEngine.js";
import { getPropertyIdsWithBookings } from "../providers/operationsDataProvider.js";

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
        averageYield: Math.round((portfolioProperties.reduce((s, p) => s + p.yieldProxy, 0) / portfolioProperties.length) * 10000) / 10000,
        averageScore: Math.round(portfolioProperties.reduce((s, p) => s + p.score, 0) / portfolioProperties.length * 10) / 10,
        properties: portfolioProperties,
      });
    } catch (error) { next(error); }
  });

  return router;
}
