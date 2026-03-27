import { Request, Response, NextFunction, Router } from "express";
import { AnalysisEngine } from "../analysis/analysisEngine.js";
import { AiSummaryService } from "../ai/summary.js";
import { AnalysisAssumptions, InvestmentAnalysis } from "../models.js";
import { ListingDataProvider, ShortTermRentalDataProvider } from "../providers/interfaces.js";

export function createAnalysisRouter(
  listingProvider: ListingDataProvider,
  strProvider: ShortTermRentalDataProvider,
  analysisEngine: AnalysisEngine,
  aiSummaryService: AiSummaryService,
  useMockData: boolean,
) {
  const router = Router();

  async function runAnalysis(
    propertyId: string,
    overrides?: Partial<AnalysisAssumptions>,
    renovationCost?: number,
  ) {
    const property = await listingProvider.getPropertyById(propertyId);
    if (!property) return null;

    const locationKey = `${property.city},${property.state}`;
    const [comparables, baseAssumptions] = await Promise.all([
      strProvider.getComparables(locationKey),
      strProvider.getAssumptions(locationKey),
    ]);

    const assumptions: AnalysisAssumptions = overrides
      ? { ...baseAssumptions, ...overrides, riskNotes: overrides.riskNotes ?? baseAssumptions.riskNotes }
      : baseAssumptions;

    const marketMetrics = analysisEngine.buildMarketMetrics(locationKey, comparables);
    const baseAnalysis = analysisEngine.analyseProperty({
      property,
      marketMetrics,
      rentalComparables: comparables,
      assumptions,
      renovationCost,
    });

    const aiSummary = await aiSummaryService.summarize(property, baseAnalysis);
    const analysis: InvestmentAnalysis = { ...baseAnalysis, aiSummary };

    return { property, analysis };
  }

  // Standard analysis (GET)
  router.get("/:propertyId", async (req: Request<{ propertyId: string }>, res: Response, next: NextFunction) => {
    try {
      const result = await runAnalysis(req.params.propertyId);
      if (!result) { res.status(404).json({ message: "Property not found" }); return; }
      res.json(result);
    } catch (error) { next(error); }
  });

  // Analysis with custom assumptions + renovation cost (POST)
  router.post("/:propertyId", async (req: Request<{ propertyId: string }>, res: Response, next: NextFunction) => {
    try {
      const { assumptions, renovationCost } = req.body as {
        assumptions?: Partial<AnalysisAssumptions>;
        renovationCost?: number;
      };
      const result = await runAnalysis(req.params.propertyId, assumptions, renovationCost);
      if (!result) { res.status(404).json({ message: "Property not found" }); return; }
      res.json(result);
    } catch (error) { next(error); }
  });

  // Expose runAnalysis for other routers
  return { router, runAnalysis };
}
