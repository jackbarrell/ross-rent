import { InvestmentAnalysis, FinancialModel, MacroData, PropertyListing } from "../models.js";

// ─── Break-Even Analysis ────────────────────────────────────

export interface BreakEvenAnalysis {
  propertyId: string;
  breakEvenOccupancy: number;   // occupancy needed to cover all costs
  breakEvenAdr: number;         // ADR needed to cover all costs
  breakEvenPrice: number;       // max purchase price for positive cashflow
  currentOccupancy: number;
  currentAdr: number;
  currentPrice: number;
  safetyMarginOccupancy: number; // how far above break-even
  safetyMarginAdr: number;
  daysToBreakEven: number;      // cumulative cashflow turns positive
}

export function calculateBreakEven(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  model: FinancialModel,
): BreakEvenAnalysis {
  const annualDebt = model.annualMortgagePayment;
  const opCost = analysis.estimatedOperatingCost;
  const totalCost = opCost + annualDebt;
  const adr = analysis.estimatedAdr;
  const occ = analysis.estimatedOccupancyRate;

  // Break-even occupancy = total costs / (ADR * 365)
  const beOccupancy = adr > 0 ? totalCost / (adr * 365) : 1;
  // Break-even ADR = total costs / (occupancy * 365)
  const beAdr = occ > 0 ? totalCost / (occ * 365) : 0;
  // Break-even purchase price ≈ solve for price where cashflow = 0
  const noiPct = analysis.estimatedNetOperatingIncome / (property.listPrice || 1);
  const bePrice = noiPct > 0 ? totalCost / noiPct : 0;

  // Days to break-even on cumulative cashflow
  let daysToBreakEven = 0;
  const dailyCashflow = model.years[0] ? model.years[0].cashflow / 365 : 0;
  const totalEquityIn = model.downPayment + model.renovationCost;
  if (dailyCashflow > 0) {
    daysToBreakEven = Math.ceil(totalEquityIn / dailyCashflow);
  } else {
    daysToBreakEven = -1; // Never breaks even
  }

  return {
    propertyId: property.id,
    breakEvenOccupancy: Math.round(beOccupancy * 10000) / 10000,
    breakEvenAdr: Math.round(beAdr * 100) / 100,
    breakEvenPrice: Math.round(bePrice),
    currentOccupancy: occ,
    currentAdr: adr,
    currentPrice: property.listPrice,
    safetyMarginOccupancy: Math.round((occ - beOccupancy) * 10000) / 10000,
    safetyMarginAdr: Math.round((adr - beAdr) * 100) / 100,
    daysToBreakEven,
  };
}

// ─── Market Analytics ───────────────────────────────────────

export interface MarketAnalytics {
  locationKey: string;
  propertyCount: number;
  avgPrice: number;
  avgPricePerSqft: number;
  avgBedrooms: number;
  avgAdr: number;
  avgOccupancy: number;
  avgYield: number;
  avgScore: number;
  avgNoi: number;
  priceRange: { min: number; max: number };
  yieldRange: { min: number; max: number };
  scoreDistribution: { excellent: number; good: number; fair: number; poor: number };
  topProperties: Array<{ id: string; address: string; score: number; yield: number }>;
  macroHighlights: string[];
}

export function calculateMarketAnalytics(
  locationKey: string,
  properties: PropertyListing[],
  analyses: Array<{ property: PropertyListing; analysis: InvestmentAnalysis }>,
  macro: MacroData | null,
): MarketAnalytics {
  const n = analyses.length;
  if (n === 0) {
    return {
      locationKey,
      propertyCount: 0,
      avgPrice: 0,
      avgPricePerSqft: 0,
      avgBedrooms: 0,
      avgAdr: 0,
      avgOccupancy: 0,
      avgYield: 0,
      avgScore: 0,
      avgNoi: 0,
      priceRange: { min: 0, max: 0 },
      yieldRange: { min: 0, max: 0 },
      scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      topProperties: [],
      macroHighlights: [],
    };
  }

  const prices = analyses.map((a) => a.property.listPrice);
  const yields = analyses.map((a) => a.analysis.yieldProxy);
  const scores = analyses.map((a) => a.analysis.attractivenessScore);

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const scoreDistribution = {
    excellent: scores.filter((s) => s >= 70).length,
    good: scores.filter((s) => s >= 50 && s < 70).length,
    fair: scores.filter((s) => s >= 35 && s < 50).length,
    poor: scores.filter((s) => s < 35).length,
  };

  const sorted = [...analyses].sort((a, b) => b.analysis.attractivenessScore - a.analysis.attractivenessScore);
  const topProperties = sorted.slice(0, 5).map((a) => ({
    id: a.property.id,
    address: a.property.address,
    score: a.analysis.attractivenessScore,
    yield: a.analysis.yieldProxy,
  }));

  const macroHighlights: string[] = [];
  if (macro) {
    if (macro.populationGrowth > 0.02) macroHighlights.push(`Strong population growth: ${(macro.populationGrowth * 100).toFixed(1)}%`);
    if (macro.homePriceAppreciation > 0.04) macroHighlights.push(`Above-average appreciation: ${(macro.homePriceAppreciation * 100).toFixed(1)}%`);
    if (macro.unemploymentRate < 0.04) macroHighlights.push(`Low unemployment: ${(macro.unemploymentRate * 100).toFixed(1)}%`);
    if (macro.tourismDemandIndex >= 7) macroHighlights.push(`High tourism demand: ${macro.tourismDemandIndex}/10`);
    if (macro.walkScore >= 70) macroHighlights.push(`Walkable area: WalkScore ${macro.walkScore}`);
    if ((macro.strRegulationRisk ?? 0) >= 7) macroHighlights.push(`⚠ High STR regulation risk: ${macro.strRegulationRisk}/10`);
  }

  return {
    locationKey,
    propertyCount: n,
    avgPrice: Math.round(avg(prices)),
    avgPricePerSqft: Math.round(avg(analyses.map((a) => a.property.listPrice / (a.property.sqft || 1)))),
    avgBedrooms: Math.round(avg(analyses.map((a) => a.property.bedrooms)) * 10) / 10,
    avgAdr: Math.round(avg(analyses.map((a) => a.analysis.estimatedAdr))),
    avgOccupancy: Math.round(avg(analyses.map((a) => a.analysis.estimatedOccupancyRate)) * 10000) / 10000,
    avgYield: Math.round(avg(yields) * 10000) / 10000,
    avgScore: Math.round(avg(scores) * 10) / 10,
    avgNoi: Math.round(avg(analyses.map((a) => a.analysis.estimatedNetOperatingIncome))),
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    yieldRange: { min: Math.round(Math.min(...yields) * 10000) / 10000, max: Math.round(Math.max(...yields) * 10000) / 10000 },
    scoreDistribution,
    topProperties,
    macroHighlights,
  };
}

// ─── Sensitivity Heatmap (2D: ADR x Occupancy → IRR) ────────

export interface HeatmapCell {
  adrMultiplier: number;
  occupancyMultiplier: number;
  irr: number;
  noi: number;
  cashflow: number;
}

export interface SensitivityHeatmap {
  propertyId: string;
  adrSteps: number[];
  occupancySteps: number[];
  cells: HeatmapCell[];
  baseAdr: number;
  baseOccupancy: number;
}

export function generateSensitivityHeatmap(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  renovationCost: number,
  macro: MacroData | null,
  generateModel: (revOverride: number, costOverride: number) => FinancialModel,
): SensitivityHeatmap {
  const adrSteps = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
  const occSteps = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];

  const cells: HeatmapCell[] = [];

  for (const adrMult of adrSteps) {
    for (const occMult of occSteps) {
      const adjRevenue = analysis.estimatedAnnualGrossRevenue * adrMult * occMult;
      const adjOpCost = analysis.estimatedOperatingCost * (adjRevenue / analysis.estimatedAnnualGrossRevenue);
      const adjNoi = adjRevenue - adjOpCost;
      const model = generateModel(adjRevenue, adjOpCost);

      cells.push({
        adrMultiplier: adrMult,
        occupancyMultiplier: occMult,
        irr: model.irr,
        noi: Math.round(adjNoi),
        cashflow: model.years[0]?.cashflow ?? 0,
      });
    }
  }

  return {
    propertyId: property.id,
    adrSteps,
    occupancySteps: occSteps,
    cells,
    baseAdr: analysis.estimatedAdr,
    baseOccupancy: analysis.estimatedOccupancyRate,
  };
}
