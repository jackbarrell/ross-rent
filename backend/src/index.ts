import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisEngine } from "./analysis/analysisEngine.js";
import { AiSummaryService } from "./ai/summary.js";
import { initDatabase } from "./db/sqlite.js";
import { AnalysisAssumptions, InvestmentAnalysis } from "./models.js";
import { MockListingProvider } from "./providers/mockListingProvider.js";
import { MockShortTermRentalProvider } from "./providers/mockStrProvider.js";
import { LiveListingProvider, LiveShortTermRentalProvider } from "./providers/liveProviders.js";
import { ListingDataProvider, ShortTermRentalDataProvider } from "./providers/interfaces.js";
import { getMacroData } from "./providers/macroDataProvider.js";
import { inferRenovation, calculateCustomRenovation, getCostLibrary } from "./providers/renovationCostEngine.js";
import { estimatePostRenovationValue } from "./providers/valuationEngine.js";
import { generateFinancialModel } from "./providers/financialModelEngine.js";
import { getOperationsSnapshot, getPropertyIdsWithBookings } from "./providers/operationsDataProvider.js";
import { getPropertyPL, getCompanyPL } from "./providers/accountingProvider.js";
import { compareForecastVsActual } from "./providers/forecastEngine.js";
import { generateInvestmentMemo } from "./ai/memoGenerator.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const useMockData = (process.env.USE_MOCK_DATA ?? "true").toLowerCase() === "true";

app.use(cors({ origin: frontendOrigin === "*" ? true : frontendOrigin }));
app.use(express.json());

const db = initDatabase();

const listingProvider: ListingDataProvider = useMockData
  ? new MockListingProvider(db)
  : new LiveListingProvider();
const strProvider: ShortTermRentalDataProvider = useMockData
  ? new MockShortTermRentalProvider(db)
  : new LiveShortTermRentalProvider();

const analysisEngine = new AnalysisEngine();
const aiSummaryService = new AiSummaryService(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL);

// ─── Helpers ────────────────────────────────────────────────

async function runAnalysis(
  propertyId: string,
  overrides?: Partial<AnalysisAssumptions>,
  renovationCost?: number
) {
  const property = await listingProvider.getPropertyById(propertyId);
  if (!property) return null;

  const locationKey = `${property.city},${property.state}`;
  const [comparables, baseAssumptions] = await Promise.all([
    strProvider.getComparables(locationKey),
    strProvider.getAssumptions(locationKey)
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
    renovationCost
  });

  const aiSummary = await aiSummaryService.summarize(property, baseAnalysis);
  const analysis: InvestmentAnalysis = { ...baseAnalysis, aiSummary };

  return { property, analysis };
}

// ─── Routes ─────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: useMockData ? "mock" : "live" });
});

app.get("/api/locations", async (_req, res, next) => {
  try {
    const locations = await listingProvider.getLocations();
    res.json({ locations });
  } catch (error) {
    next(error);
  }
});

app.get("/api/properties", async (req, res, next) => {
  try {
    const location = String(req.query.location ?? "");
    const properties = await listingProvider.searchProperties(location);
    res.json({ properties });
  } catch (error) {
    next(error);
  }
});

app.get("/api/properties/:id", async (req, res, next) => {
  try {
    const property = await listingProvider.getPropertyById(req.params.id);
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res.json({ property });
  } catch (error) {
    next(error);
  }
});

// Standard analysis (GET)
app.get("/api/analysis/:propertyId", async (req, res, next) => {
  try {
    const result = await runAnalysis(req.params.propertyId);
    if (!result) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Analysis with custom assumptions + renovation cost (POST)
app.post("/api/analysis/:propertyId", async (req, res, next) => {
  try {
    const { assumptions, renovationCost } = req.body as {
      assumptions?: Partial<AnalysisAssumptions>;
      renovationCost?: number;
    };
    const result = await runAnalysis(req.params.propertyId, assumptions, renovationCost);
    if (!result) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Rank all properties in a location by attractiveness score
app.get("/api/ranking", async (req, res, next) => {
  try {
    const location = String(req.query.location ?? "");
    const properties = await listingProvider.searchProperties(location);

    const ranked: Array<{
      propertyId: string;
      address: string;
      city: string;
      state: string;
      listPrice: number;
      propertyType: string;
      bedrooms: number;
      bathrooms: number;
      attractivenessScore: number;
      yieldProxy: number;
      estimatedAdr: number;
      estimatedMonthlyGrossRevenue: number;
      estimatedNetOperatingIncome: number;
      confidence: string;
    }> = [];

    for (const property of properties) {
      const locationKey = `${property.city},${property.state}`;
      const [comparables, assumptions] = await Promise.all([
        strProvider.getComparables(locationKey),
        strProvider.getAssumptions(locationKey)
      ]);
      const marketMetrics = analysisEngine.buildMarketMetrics(locationKey, comparables);
      const analysis = analysisEngine.analyseProperty({
        property,
        marketMetrics,
        rentalComparables: comparables,
        assumptions
      });
      ranked.push({
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
        confidence: analysis.confidence
      });
    }

    ranked.sort((a, b) => b.attractivenessScore - a.attractivenessScore);
    res.json({ ranked });
  } catch (error) {
    next(error);
  }
});

// ─── Macro Data ────────────────────────────────────────────

app.get("/api/macro/:locationKey", (req, res) => {
  const data = getMacroData(decodeURIComponent(req.params.locationKey));
  if (!data) {
    res.status(404).json({ message: "Macro data not found for location" });
    return;
  }
  res.json(data);
});

// ─── Renovation Cost Engine ────────────────────────────────

app.get("/api/cost-library", (_req, res) => {
  res.json(getCostLibrary());
});

app.get("/api/renovation/:propertyId", async (req, res, next) => {
  try {
    const property = await listingProvider.getPropertyById(req.params.propertyId);
    if (!property) { res.status(404).json({ message: "Property not found" }); return; }
    const estimate = inferRenovation(property);
    res.json(estimate);
  } catch (error) { next(error); }
});

app.post("/api/renovation/:propertyId", async (req, res, next) => {
  try {
    const { items } = req.body as { items: Array<{ category: string; quantity: number }> };
    const estimate = calculateCustomRenovation(req.params.propertyId, items ?? []);
    res.json(estimate);
  } catch (error) { next(error); }
});

// ─── Valuation Engine ──────────────────────────────────────

app.get("/api/valuation/:propertyId", async (req, res, next) => {
  try {
    const property = await listingProvider.getPropertyById(req.params.propertyId);
    if (!property) { res.status(404).json({ message: "Property not found" }); return; }
    const renovationCost = Number(req.query.renovationCost ?? 0);
    const result = estimatePostRenovationValue(property, renovationCost);
    res.json(result);
  } catch (error) { next(error); }
});

// ─── Financial Model ───────────────────────────────────────

app.get("/api/financial-model/:propertyId", async (req, res, next) => {
  try {
    const result = await runAnalysis(req.params.propertyId);
    if (!result) { res.status(404).json({ message: "Property not found" }); return; }
    const renovationCost = Number(req.query.renovationCost ?? 0);
    const locationKey = `${result.property.city},${result.property.state}`;
    const macro = getMacroData(locationKey);
    const model = generateFinancialModel(result.property, result.analysis, renovationCost, macro);
    res.json(model);
  } catch (error) { next(error); }
});

// ─── Investment Memo ───────────────────────────────────────

app.get("/api/memo/:propertyId", async (req, res, next) => {
  try {
    const result = await runAnalysis(req.params.propertyId);
    if (!result) { res.status(404).json({ message: "Property not found" }); return; }
    const locationKey = `${result.property.city},${result.property.state}`;
    const macro = getMacroData(locationKey);
    const renovation = inferRenovation(result.property);
    const valuation = estimatePostRenovationValue(result.property, renovation.totalCapexEstimate);
    const model = generateFinancialModel(result.property, result.analysis, renovation.totalCapexEstimate, macro);
    const memo = generateInvestmentMemo(result.property, result.analysis, macro, renovation, valuation, model);
    res.json(memo);
  } catch (error) { next(error); }
});

// ─── Operations ────────────────────────────────────────────

app.get("/api/operations/:propertyId", (req, res) => {
  const snapshot = getOperationsSnapshot(req.params.propertyId);
  if (!snapshot) {
    res.json({ propertyId: req.params.propertyId, hasData: false });
    return;
  }
  res.json({ ...snapshot, hasData: true });
});

// ─── Accounting ────────────────────────────────────────────

app.get("/api/accounting", async (_req, res, next) => {
  try {
    const addressLookup = async (id: string) => {
      const p = await listingProvider.getPropertyById(id);
      return p?.address ?? id;
    };
    // Build sync lookup
    const properties = await listingProvider.searchProperties("");
    const addrMap = new Map(properties.map(p => [p.id, p.address]));
    const pl = getCompanyPL((id) => addrMap.get(id) ?? id);
    res.json(pl);
  } catch (error) { next(error); }
});

app.get("/api/accounting/:propertyId", async (req, res, next) => {
  try {
    const property = await listingProvider.getPropertyById(req.params.propertyId);
    const pl = getPropertyPL(req.params.propertyId, () => property?.address ?? req.params.propertyId);
    res.json(pl);
  } catch (error) { next(error); }
});

// ─── Forecast vs Actual ────────────────────────────────────

app.get("/api/forecast-vs-actual/:propertyId", async (req, res, next) => {
  try {
    const result = await runAnalysis(req.params.propertyId);
    if (!result) { res.status(404).json({ message: "Property not found" }); return; }
    const operations = getOperationsSnapshot(req.params.propertyId);
    if (!operations) {
      res.json({ propertyId: req.params.propertyId, hasData: false });
      return;
    }
    const comparison = compareForecastVsActual(result.analysis, operations);
    res.json({ ...comparison, hasData: true });
  } catch (error) { next(error); }
});

// ─── Portfolio ─────────────────────────────────────────────

app.get("/api/portfolio", async (_req, res, next) => {
  try {
    const properties = await listingProvider.searchProperties("");
    const opsPropertyIds = new Set(getPropertyIdsWithBookings());
    const portfolioProperties = [];

    for (const property of properties) {
      const locationKey = `${property.city},${property.state}`;
      const [comparables, assumptions] = await Promise.all([
        strProvider.getComparables(locationKey),
        strProvider.getAssumptions(locationKey)
      ]);
      const marketMetrics = analysisEngine.buildMarketMetrics(locationKey, comparables);
      const analysis = analysisEngine.analyseProperty({ property, marketMetrics, rentalComparables: comparables, assumptions });

      portfolioProperties.push({
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
      });
    }

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

// ─── Serve frontend static build in production ────────────

const frontendOutDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/out"
);

if (fs.existsSync(frontendOutDir)) {
  app.use(express.static(frontendOutDir));
  // SPA fallback: serve index.html for any non-API route
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    const reqPath = _req.path.replace(/\/$/, "") || "/index";
    const htmlFile = path.join(frontendOutDir, `${reqPath}.html`);
    if (fs.existsSync(htmlFile)) {
      res.sendFile(htmlFile);
    } else {
      res.sendFile(path.join(frontendOutDir, "index.html"));
    }
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
