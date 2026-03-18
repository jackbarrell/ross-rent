import { InvestmentAnalysis, FinancialModel, PropertyListing } from "../models.js";

// ─── Portfolio Risk Metrics ─────────────────────────────────

export interface PortfolioRiskMetrics {
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  weightedAvgYield: number;
  weightedAvgIrr: number;
  portfolioVolatility: number; // std dev of yields
  concentrationRisk: ConcentrationRisk;
  riskRating: "Low" | "Moderate" | "High" | "Very High";
  diversificationScore: number; // 0-100
  allocationBreakdown: AllocationSlice[];
  riskFactors: string[];
}

export interface ConcentrationRisk {
  topPropertyPct: number;     // largest property % of portfolio value
  topLocationPct: number;     // largest location % of portfolio
  propertyTypeConcentration: Record<string, number>;
  locationConcentration: Record<string, number>;
}

export interface AllocationSlice {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const LOCATION_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#ec4899", "#f97316"];
const TYPE_COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export function calculatePortfolioRisk(
  properties: PropertyListing[],
  analyses: InvestmentAnalysis[],
  models: FinancialModel[],
): PortfolioRiskMetrics {
  const n = properties.length;
  if (n === 0) {
    return {
      totalProperties: 0, totalValue: 0, totalEquity: 0,
      weightedAvgYield: 0, weightedAvgIrr: 0, portfolioVolatility: 0,
      concentrationRisk: { topPropertyPct: 0, topLocationPct: 0, propertyTypeConcentration: {}, locationConcentration: {} },
      riskRating: "Low", diversificationScore: 0,
      allocationBreakdown: [], riskFactors: [],
    };
  }

  const totalValue = properties.reduce((s, p) => s + p.listPrice, 0);
  const totalEquity = models.reduce((s, m) => s + m.downPayment + m.renovationCost, 0);

  // Weighted average yield & IRR
  const weightedYield = analyses.reduce((s, a, i) =>
    s + a.yieldProxy * (properties[i].listPrice / totalValue), 0);
  const weightedIrr = models.reduce((s, m, i) =>
    s + m.irr * (properties[i].listPrice / totalValue), 0);

  // Volatility (std dev of yields)
  const yields = analyses.map((a) => a.yieldProxy);
  const avgYield = yields.reduce((s, y) => s + y, 0) / n;
  const variance = yields.reduce((s, y) => s + (y - avgYield) ** 2, 0) / n;
  const volatility = Math.sqrt(variance);

  // Concentration risk
  const maxPropertyPct = Math.max(...properties.map((p) => p.listPrice / totalValue));

  const locationValues: Record<string, number> = {};
  const typeValues: Record<string, number> = {};
  properties.forEach((p) => {
    const loc = `${p.city}, ${p.state}`;
    locationValues[loc] = (locationValues[loc] ?? 0) + p.listPrice;
    typeValues[p.propertyType] = (typeValues[p.propertyType] ?? 0) + p.listPrice;
  });

  const locationPcts: Record<string, number> = {};
  const typePcts: Record<string, number> = {};
  for (const [k, v] of Object.entries(locationValues)) locationPcts[k] = Math.round(v / totalValue * 10000) / 10000;
  for (const [k, v] of Object.entries(typeValues)) typePcts[k] = Math.round(v / totalValue * 10000) / 10000;

  const maxLocationPct = Math.max(...Object.values(locationPcts));

  const concentrationRisk: ConcentrationRisk = {
    topPropertyPct: Math.round(maxPropertyPct * 10000) / 10000,
    topLocationPct: Math.round(maxLocationPct * 10000) / 10000,
    propertyTypeConcentration: typePcts,
    locationConcentration: locationPcts,
  };

  // Diversification score
  const locationCount = Object.keys(locationValues).length;
  const typeCount = Object.keys(typeValues).length;
  const diversificationScore = Math.min(100, Math.round(
    (Math.min(locationCount, 5) / 5 * 50) +
    (Math.min(typeCount, 3) / 3 * 25) +
    ((1 - maxPropertyPct) * 25)
  ));

  // Risk rating
  let riskRating: PortfolioRiskMetrics["riskRating"];
  if (volatility < 0.02 && maxLocationPct < 0.5 && diversificationScore > 60) riskRating = "Low";
  else if (volatility < 0.04 && diversificationScore > 40) riskRating = "Moderate";
  else if (volatility < 0.06) riskRating = "High";
  else riskRating = "Very High";

  // Allocation breakdown by location
  const allocationBreakdown: AllocationSlice[] = Object.entries(locationValues)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      percentage: Math.round(value / totalValue * 10000) / 10000,
      color: LOCATION_COLORS[i % LOCATION_COLORS.length],
    }));

  // Risk factors
  const riskFactors: string[] = [];
  if (maxLocationPct > 0.6) riskFactors.push(`High geographic concentration: ${(maxLocationPct * 100).toFixed(0)}% in one location`);
  if (maxPropertyPct > 0.3) riskFactors.push(`Single property represents ${(maxPropertyPct * 100).toFixed(0)}% of portfolio value`);
  if (locationCount < 3) riskFactors.push("Limited geographic diversification (fewer than 3 markets)");
  if (typeCount < 2) riskFactors.push("No property type diversification");
  const negCashflowCount = models.filter((m) => m.years[0]?.cashflow < 0).length;
  if (negCashflowCount > 0) riskFactors.push(`${negCashflowCount} properties with negative Year 1 cashflow`);
  if (volatility > 0.04) riskFactors.push(`High yield dispersion (σ=${(volatility * 100).toFixed(1)}%)`);

  return {
    totalProperties: n,
    totalValue,
    totalEquity,
    weightedAvgYield: Math.round(weightedYield * 10000) / 10000,
    weightedAvgIrr: Math.round(weightedIrr * 10000) / 10000,
    portfolioVolatility: Math.round(volatility * 10000) / 10000,
    concentrationRisk,
    riskRating,
    diversificationScore,
    allocationBreakdown,
    riskFactors,
  };
}

// ─── Investment Waterfall ───────────────────────────────────

export interface WaterfallStep {
  label: string;
  value: number;
  cumulative: number;
  type: "positive" | "negative" | "subtotal";
}

export interface WaterfallAnalysis {
  propertyId: string;
  steps: WaterfallStep[];
  totalReturn: number;
  equityMultiple: number;
}

export function generateWaterfall(
  property: PropertyListing,
  model: FinancialModel,
): WaterfallAnalysis {
  const steps: WaterfallStep[] = [];
  let cumulative = 0;

  // Initial investment (negative)
  const totalEquityIn = model.downPayment + model.renovationCost;
  cumulative -= totalEquityIn;
  steps.push({
    label: "Initial Equity Investment",
    value: -totalEquityIn,
    cumulative,
    type: "negative",
  });

  // Cumulative cashflow years 1-5
  const totalCashflow = model.years.reduce((s, y) => s + y.cashflow, 0);
  cumulative += totalCashflow;
  steps.push({
    label: "Cumulative Net Cashflow (5yr)",
    value: totalCashflow,
    cumulative,
    type: totalCashflow >= 0 ? "positive" : "negative",
  });

  // Property appreciation
  const appreciation = model.years[4].propertyValue - (property.listPrice + model.renovationCost);
  cumulative += appreciation;
  steps.push({
    label: "Property Appreciation",
    value: appreciation,
    cumulative,
    type: "positive",
  });

  // Mortgage paydown (principal reduction)
  const principalPaydown = model.loanAmount - model.years[4].loanBalance;
  cumulative += principalPaydown;
  steps.push({
    label: "Mortgage Principal Paydown",
    value: principalPaydown,
    cumulative,
    type: "positive",
  });

  // Refinance equity (if applicable)
  if (model.refinanceScenario.equityPulledOut > 0) {
    steps.push({
      label: "Refinance Equity Pull-Out",
      value: model.refinanceScenario.equityPulledOut,
      cumulative: cumulative + model.refinanceScenario.equityPulledOut,
      type: "positive",
    });
    cumulative += model.refinanceScenario.equityPulledOut;
  }

  // Terminal equity (sale proceeds minus loan payoff)
  const terminalEquity = model.years[4].propertyValue - model.years[4].loanBalance;
  steps.push({
    label: "Terminal Equity (Year 5)",
    value: terminalEquity,
    cumulative: terminalEquity,
    type: "subtotal",
  });

  const equityMultiple = totalEquityIn > 0
    ? (totalCashflow + terminalEquity) / totalEquityIn
    : 0;

  return {
    propertyId: property.id,
    steps,
    totalReturn: model.totalReturn,
    equityMultiple: Math.round(equityMultiple * 100) / 100,
  };
}
