import {
  AnalysisAssumptions,
  CostBreakdown,
  InvestmentAnalysis,
  MarketMetrics,
  PropertyListing,
  RentalComparable
} from "../models.js";

const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(values.length, 1);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const round2 = (n: number) => Number(n.toFixed(2));

export class AnalysisEngine {
  buildMarketMetrics(locationKey: string, comps: RentalComparable[]): MarketMetrics {
    return {
      locationKey,
      comparablesCount: comps.length,
      estimatedAdr: Number(average(comps.map((c) => c.adr)).toFixed(2)),
      estimatedOccupancyRate: Number(average(comps.map((c) => c.occupancyRate)).toFixed(4)),
      averageReviews: Number(average(comps.map((c) => c.reviews)).toFixed(1)),
      averageDistanceMiles: Number(average(comps.map((c) => c.distanceMiles)).toFixed(2))
    };
  }

  analyseProperty(input: {
    property: PropertyListing;
    marketMetrics: MarketMetrics;
    rentalComparables: RentalComparable[];
    assumptions: AnalysisAssumptions;
    renovationCost?: number;
  }): Omit<InvestmentAnalysis, "aiSummary"> {
    const { property, marketMetrics, rentalComparables, assumptions, renovationCost = 0 } = input;

    // --- ADR adjustments ---
    const bedroomAdjustment = 1 + (property.bedrooms - 3) * 0.04;
    const typeAdjustment = property.propertyType === "Condo" ? 0.95 : property.propertyType === "Townhome" ? 0.98 : 1;

    const estimatedAdr = round2(
      marketMetrics.estimatedAdr * bedroomAdjustment * typeAdjustment * assumptions.seasonalityIndex
    );

    const estimatedOccupancyRate = Number(
      clamp(marketMetrics.estimatedOccupancyRate - assumptions.vacancyBuffer, 0.35, 0.9).toFixed(4)
    );

    // --- Revenue ---
    const estimatedMonthlyGrossRevenue = round2(
      estimatedAdr * estimatedOccupancyRate * assumptions.baseMonthlyDays
    );
    const estimatedAnnualGrossRevenue = round2(estimatedMonthlyGrossRevenue * 12);

    // --- Cost breakdown ---
    const totalBasis = property.listPrice + renovationCost;

    const managementFees = round2(estimatedAnnualGrossRevenue * assumptions.managementFeeRate);
    const maintenanceCosts = round2(estimatedAnnualGrossRevenue * assumptions.maintenanceRate);
    const platformFees = round2(estimatedAnnualGrossRevenue * assumptions.platformFeeRate);
    const capitalReserves = round2(estimatedAnnualGrossRevenue * assumptions.capitalReserveRate);
    const totalVariable = round2(managementFees + maintenanceCosts + platformFees + capitalReserves);

    const utilities = round2(assumptions.utilitiesMonthly * 12);
    const supplies = round2(assumptions.suppliesMonthly * 12);
    const insurance = round2(assumptions.insuranceAnnual);
    const propertyTax = round2(totalBasis * assumptions.taxRateAnnual);
    const totalFixed = round2(utilities + supplies + insurance + propertyTax);

    const estimatedOperatingCost = round2(totalVariable + totalFixed);
    const costBreakdown: CostBreakdown = {
      managementFees,
      maintenanceCosts,
      platformFees,
      capitalReserves,
      utilities,
      supplies,
      insurance,
      propertyTax,
      totalVariable,
      totalFixed,
      totalOperatingCost: estimatedOperatingCost
    };

    // --- Returns ---
    const estimatedNetOperatingIncome = round2(estimatedAnnualGrossRevenue - estimatedOperatingCost);
    const yieldProxy = Number((estimatedNetOperatingIncome / totalBasis).toFixed(4));

    // --- Scoring ---
    const scoreYieldComponent = clamp(yieldProxy / 0.12, 0, 1) * 50;
    const scoreOccupancyComponent = clamp(estimatedOccupancyRate / 0.8, 0, 1) * 25;
    const scoreCompDepthComponent = clamp(rentalComparables.length / 8, 0, 1) * 15;
    const scoreRiskPenalty = assumptions.riskNotes.length > 1 ? 8 : 4;

    const attractivenessScore = Number(
      clamp(scoreYieldComponent + scoreOccupancyComponent + scoreCompDepthComponent - scoreRiskPenalty, 0, 100).toFixed(1)
    );

    const confidence: InvestmentAnalysis["confidence"] =
      rentalComparables.length >= 6 ? "High" : rentalComparables.length >= 4 ? "Medium" : "Low";

    return {
      propertyId: property.id,
      locationKey: `${property.city},${property.state}`,
      estimatedAdr,
      estimatedOccupancyRate,
      estimatedMonthlyGrossRevenue,
      estimatedAnnualGrossRevenue,
      estimatedOperatingCost,
      estimatedNetOperatingIncome,
      yieldProxy,
      attractivenessScore,
      confidence,
      assumptions,
      costBreakdown,
      marketMetrics,
      rentalComparables
    };
  }
}
