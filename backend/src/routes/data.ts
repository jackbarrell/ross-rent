import { Router } from "express";
import { AnalysisAssumptions, InvestmentAnalysis, PropertyListing, SensitivityResult } from "../models.js";
import { ListingDataProvider } from "../providers/interfaces.js";
import { fetchLiveMacroData } from "../providers/liveProviders.js";
import { getMacroData } from "../providers/macroDataProvider.js";
import { inferRenovation, calculateCustomRenovation, getCostLibrary } from "../providers/renovationCostEngine.js";
import { estimatePostRenovationValue, fetchLiveComparableSales } from "../providers/valuationEngine.js";
import { getOperationsSnapshot } from "../providers/operationsDataProvider.js";
import { getPropertyPL, getCompanyPL } from "../providers/accountingProvider.js";
import { compareForecastVsActual } from "../providers/forecastEngine.js";
import { getAllDeals, upsertDeal, deleteDeal } from "../db/sqlite.js";
import { DealStatus } from "../models.js";
import { generateFinancialModel } from "../providers/financialModelEngine.js";
import { generateInvestmentMemo } from "../ai/memoGenerator.js";

type RunAnalysisFn = (
  propertyId: string,
  overrides?: Partial<AnalysisAssumptions>,
  renovationCost?: number,
) => Promise<{ property: PropertyListing; analysis: InvestmentAnalysis } | null>;

export function createDataRouter(
  listingProvider: ListingDataProvider,
  runAnalysis: RunAnalysisFn,
  useMockData: boolean,
) {
  const router = Router();

  // ─── Macro Data ────────────────────────────────────────────
  router.get("/macro/:locationKey", async (req, res, next) => {
    try {
      const locationKey = decodeURIComponent(req.params.locationKey);
      if (useMockData) {
        const data = getMacroData(locationKey);
        if (!data) { res.status(404).json({ message: "Macro data not found for location" }); return; }
        res.json(data);
      } else {
        const properties = await listingProvider.searchProperties(locationKey);
        const sampleProp = properties[0];
        const data = await fetchLiveMacroData(locationKey, sampleProp?.lat, sampleProp?.lng);
        if (!data) { res.status(404).json({ message: "Could not fetch macro data" }); return; }
        res.json(data);
      }
    } catch (error) { next(error); }
  });

  // ─── Renovation Cost Engine ────────────────────────────────
  router.get("/cost-library", (_req, res) => {
    res.json(getCostLibrary());
  });

  router.get("/renovation/:propertyId", async (req, res, next) => {
    try {
      const property = await listingProvider.getPropertyById(req.params.propertyId);
      if (!property) { res.status(404).json({ message: "Property not found" }); return; }
      const estimate = inferRenovation(property);
      res.json(estimate);
    } catch (error) { next(error); }
  });

  router.post("/renovation/:propertyId", async (req, res, next) => {
    try {
      const { items } = req.body as { items: Array<{ category: string; quantity: number }> };
      const estimate = calculateCustomRenovation(req.params.propertyId, items ?? []);
      res.json(estimate);
    } catch (error) { next(error); }
  });

  // ─── Valuation Engine ──────────────────────────────────────
  router.get("/valuation/:propertyId", async (req, res, next) => {
    try {
      const property = await listingProvider.getPropertyById(req.params.propertyId);
      if (!property) { res.status(404).json({ message: "Property not found" }); return; }
      const renovationCost = Number(req.query.renovationCost ?? 0);
      const extraSales = useMockData ? undefined : await fetchLiveComparableSales(property);
      const result = estimatePostRenovationValue(property, renovationCost, extraSales);
      res.json(result);
    } catch (error) { next(error); }
  });

  // ─── Financial Model ───────────────────────────────────────
  router.get("/financial-model/:propertyId", async (req, res, next) => {
    try {
      const result = await runAnalysis(req.params.propertyId);
      if (!result) { res.status(404).json({ message: "Property not found" }); return; }
      const renovationCost = Number(req.query.renovationCost ?? 0);
      const locationKey = `${result.property.city},${result.property.state}`;
      const macro = getMacroData(locationKey);
      const model = generateFinancialModel(
        result.property,
        result.analysis,
        renovationCost, macro,
      );
      res.json(model);
    } catch (error) { next(error); }
  });

  // ─── Investment Memo ───────────────────────────────────────
  router.get("/memo/:propertyId", async (req, res, next) => {
    try {
      const result = await runAnalysis(req.params.propertyId);
      if (!result) { res.status(404).json({ message: "Property not found" }); return; }
      const locationKey = `${result.property.city},${result.property.state}`;
      const macro = getMacroData(locationKey);
      const renovation = inferRenovation(result.property);
      const extraSales = useMockData ? undefined : await fetchLiveComparableSales(result.property);
      const valuation = estimatePostRenovationValue(result.property, renovation.totalCapexEstimate, extraSales);
      const model = generateFinancialModel(
        result.property,
        result.analysis,
        renovation.totalCapexEstimate, macro,
      );
      const memo = generateInvestmentMemo(
        result.property,
        result.analysis,
        macro, renovation, valuation, model,
      );
      res.json(memo);
    } catch (error) { next(error); }
  });

  // ─── Sensitivity Analysis ──────────────────────────────────
  router.get("/sensitivity/:propertyId", async (req, res, next) => {
    try {
      const result = await runAnalysis(req.params.propertyId);
      if (!result) { res.status(404).json({ message: "Property not found" }); return; }
      const { property, analysis } = result;
      const locationKey = `${property.city},${property.state}`;
      const macro = getMacroData(locationKey);
      const renovation = inferRenovation(property);
      const renovationCost = renovation.totalCapexEstimate;

      const results: SensitivityResult[] = [];

      // ADR sensitivity — parallelized
      const adrMultipliers = [
        { label: "-20%", factor: 0.8 }, { label: "-10%", factor: 0.9 },
        { label: "Base", factor: 1.0 }, { label: "+10%", factor: 1.1 }, { label: "+20%", factor: 1.2 },
      ];
      const adrScenarios = await Promise.all(
        adrMultipliers.map(async (m) => {
          const adjResult = await runAnalysis(req.params.propertyId, {
            seasonalityIndex: analysis.assumptions.seasonalityIndex * m.factor,
          });
          if (!adjResult) return null;
          const adjModel = generateFinancialModel(
            property,
            adjResult.analysis,
            renovationCost, macro,
          );
          return {
            label: m.label,
            value: Math.round(adjResult.analysis.estimatedAdr),
            noi: adjResult.analysis.estimatedNetOperatingIncome,
            cashflow: adjModel.years[0].cashflow,
            irr: adjModel.irr,
            cashOnCash: adjModel.cashOnCash,
          };
        }),
      );
      results.push({ variable: "ADR", scenarios: adrScenarios.filter(Boolean) as SensitivityResult["scenarios"] });

      // Occupancy sensitivity — parallelized
      const vacBuffers = [
        { label: "High vacancy (+10%)", val: analysis.assumptions.vacancyBuffer + 0.1 },
        { label: "Moderate vacancy (+5%)", val: analysis.assumptions.vacancyBuffer + 0.05 },
        { label: "Base", val: analysis.assumptions.vacancyBuffer },
        { label: "Low vacancy (-5%)", val: Math.max(0, analysis.assumptions.vacancyBuffer - 0.05) },
        { label: "Minimal vacancy (-10%)", val: Math.max(0, analysis.assumptions.vacancyBuffer - 0.1) },
      ];
      const occScenarios = await Promise.all(
        vacBuffers.map(async (v) => {
          const adjResult = await runAnalysis(req.params.propertyId, { vacancyBuffer: v.val });
          if (!adjResult) return null;
          const adjModel = generateFinancialModel(
            property,
            adjResult.analysis,
            renovationCost, macro,
          );
          return {
            label: v.label,
            value: Math.round(adjResult.analysis.estimatedOccupancyRate * 100),
            noi: adjResult.analysis.estimatedNetOperatingIncome,
            cashflow: adjModel.years[0].cashflow,
            irr: adjModel.irr,
            cashOnCash: adjModel.cashOnCash,
          };
        }),
      );
      results.push({ variable: "Occupancy", scenarios: occScenarios.filter(Boolean) as SensitivityResult["scenarios"] });

      // Interest rate sensitivity
      const rates = [0.05, 0.055, 0.065, 0.075, 0.08];
      const rateScenarios = rates.map((rate) => {
        const adjModel = generateFinancialModel(
          property,
          analysis,
          renovationCost, macro, { interestRate: rate },
        );
        return {
          label: `${(rate * 100).toFixed(1)}%`,
          value: rate * 100,
          noi: analysis.estimatedNetOperatingIncome,
          cashflow: adjModel.years[0].cashflow,
          irr: adjModel.irr,
          cashOnCash: adjModel.cashOnCash,
        };
      });
      results.push({ variable: "Interest Rate", scenarios: rateScenarios });

      res.json({ sensitivity: results });
    } catch (error) { next(error); }
  });

  // ─── Operations ────────────────────────────────────────────
  router.get("/operations/:propertyId", (req, res) => {
    const snapshot = getOperationsSnapshot(req.params.propertyId);
    if (!snapshot) {
      res.json({ propertyId: req.params.propertyId, hasData: false });
      return;
    }
    res.json({ ...snapshot, hasData: true });
  });

  // ─── Accounting ────────────────────────────────────────────
  router.get("/accounting", async (_req, res, next) => {
    try {
      const properties = await listingProvider.searchProperties("");
      const addrMap = new Map(properties.map((p) => [p.id, p.address]));
      const pl = getCompanyPL((id) => addrMap.get(id) ?? id);
      res.json(pl);
    } catch (error) { next(error); }
  });

  router.get("/accounting/:propertyId", async (req, res, next) => {
    try {
      const property = await listingProvider.getPropertyById(req.params.propertyId);
      const pl = getPropertyPL(req.params.propertyId, () => property?.address ?? req.params.propertyId);
      res.json(pl);
    } catch (error) { next(error); }
  });

  // ─── Forecast vs Actual ────────────────────────────────────
  router.get("/forecast-vs-actual/:propertyId", async (req, res, next) => {
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

  router.post("/forecast-vs-actual/:propertyId/apply", async (req, res, next) => {
    try {
      const result = await runAnalysis(req.params.propertyId);
      if (!result) { res.status(404).json({ message: "Property not found" }); return; }
      const operations = getOperationsSnapshot(req.params.propertyId);
      if (!operations) { res.status(404).json({ message: "No operations data" }); return; }

      const comparison = compareForecastVsActual(result.analysis, operations);
      const calibratedOverrides: Partial<AnalysisAssumptions> = {};
      for (const adj of comparison.adjustedAssumptions) {
        if (adj.field === "vacancyBuffer") calibratedOverrides.vacancyBuffer = adj.suggestedValue;
        else if (adj.field === "estimatedAdr") calibratedOverrides.adrOverride = adj.suggestedValue;
      }
      const calibrated = await runAnalysis(req.params.propertyId, calibratedOverrides);
      if (!calibrated) { res.status(500).json({ message: "Calibration failed" }); return; }

      res.json({ applied: comparison.adjustedAssumptions, calibratedAnalysis: calibrated.analysis });
    } catch (error) { next(error); }
  });

  // ─── Deal Pipeline ─────────────────────────────────────────
  router.get("/deals", (_req, res) => {
    res.json({ deals: getAllDeals() });
  });

  router.post("/deals", (req, res) => {
    const { propertyId, status, notes } = req.body as { propertyId: string; status?: DealStatus; notes?: string };
    if (!propertyId) { res.status(400).json({ message: "propertyId required" }); return; }
    const deal = upsertDeal(propertyId, status ?? "watching", notes ?? "");
    res.json(deal);
  });

  router.delete("/deals/:propertyId", (req, res) => {
    deleteDeal(req.params.propertyId);
    res.json({ ok: true });
  });

  // ─── Property Comparison — parallelized ────────────────────
  router.post("/compare", async (req, res, next) => {
    try {
      const { propertyIds } = req.body as { propertyIds: string[] };
      if (!propertyIds || propertyIds.length < 2) {
        res.status(400).json({ message: "Provide at least 2 propertyIds" });
        return;
      }
      const rows = await Promise.all(
        propertyIds.slice(0, 5).map(async (pid) => {
          const result = await runAnalysis(pid);
          if (!result) return null;
          const { property, analysis } = result;
          const locationKey = `${property.city},${property.state}`;
          const macro = getMacroData(locationKey);
          const renovation = inferRenovation(property);
          const extraSales = useMockData ? undefined : await fetchLiveComparableSales(property);
          const valuation = estimatePostRenovationValue(property, renovation.totalCapexEstimate, extraSales);
          const model = generateFinancialModel(property, analysis, renovation.totalCapexEstimate, macro);
          return {
            propertyId: property.id as string,
            address: property.address as string,
            city: property.city,
            state: property.state,
            listPrice: property.listPrice as number,
            bedrooms: property.bedrooms as number,
            bathrooms: property.bathrooms as number,
            sqft: property.sqft as number,
            estimatedAdr: analysis.estimatedAdr,
            estimatedOccupancy: analysis.estimatedOccupancyRate as number,
            annualRevenue: analysis.estimatedAnnualGrossRevenue,
            noi: analysis.estimatedNetOperatingIncome,
            yieldProxy: analysis.yieldProxy,
            score: analysis.attractivenessScore,
            irr: model.irr,
            cashOnCash: model.cashOnCash,
            dscr: model.dscr,
            renovationCost: renovation.totalCapexEstimate,
            equityCreated: valuation.equityCreated,
          };
        }),
      );
      res.json({ comparisons: rows.filter(Boolean) });
    } catch (error) { next(error); }
  });

  return router;
}
