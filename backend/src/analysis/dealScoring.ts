import { InvestmentAnalysis, MacroData, FinancialModel, ValuationResult, RenovationEstimate } from "../models.js";

export type DealGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";

export interface DealScoreBreakdown {
  category: string;
  score: number;    // 0-100
  weight: number;   // 0-1
  weighted: number;  // score * weight
  details: string;
}

export interface DealScoreCard {
  propertyId: string;
  overallScore: number;  // 0-100
  grade: DealGrade;
  breakdown: DealScoreBreakdown[];
  radarData: RadarPoint[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface RadarPoint {
  axis: string;
  value: number; // 0-100
}

function scoreToGrade(score: number): DealGrade {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 45) return "D";
  return "F";
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function generateDealScoreCard(
  analysis: InvestmentAnalysis,
  macro: MacroData | null,
  financialModel: FinancialModel,
  valuation: ValuationResult,
  renovation: RenovationEstimate,
): DealScoreCard {
  const breakdown: DealScoreBreakdown[] = [];

  // 1. Yield Score (20% weight) — score 100 at 12% yield, linear below
  const yieldPct = analysis.yieldProxy * 100;
  const yieldScore = clamp((yieldPct / 12) * 100, 0, 100);
  breakdown.push({
    category: "Yield & Returns",
    score: Math.round(yieldScore),
    weight: 0.20,
    weighted: Math.round(yieldScore * 0.20),
    details: `Yield proxy: ${yieldPct.toFixed(1)}%. Target: 8-12%+.`,
  });

  // 2. Cash Flow Score (15% weight)
  const y1Cashflow = financialModel.years[0]?.cashflow ?? 0;
  const cashflowScore = y1Cashflow > 0
    ? clamp(50 + (y1Cashflow / 5000) * 50, 50, 100)
    : clamp(50 + (y1Cashflow / 10000) * 50, 0, 50);
  breakdown.push({
    category: "Cash Flow",
    score: Math.round(cashflowScore),
    weight: 0.15,
    weighted: Math.round(cashflowScore * 0.15),
    details: `Year 1 cashflow: $${y1Cashflow.toLocaleString()}. CoC: ${(financialModel.cashOnCash * 100).toFixed(1)}%.`,
  });

  // 3. IRR Score (15% weight)
  const irrPct = financialModel.irr * 100;
  const irrScore = clamp((irrPct / 20) * 100, 0, 100);
  breakdown.push({
    category: "IRR (5-Year)",
    score: Math.round(irrScore),
    weight: 0.15,
    weighted: Math.round(irrScore * 0.15),
    details: `Estimated IRR: ${irrPct.toFixed(1)}%. Target: 15-20%+.`,
  });

  // 4. DSCR Score (10% weight)
  const dscr = financialModel.dscr;
  const dscrScore = dscr >= 1.5 ? 100 : dscr >= 1.25 ? 80 : dscr >= 1.0 ? 60 : dscr >= 0.8 ? 30 : 0;
  breakdown.push({
    category: "Debt Coverage (DSCR)",
    score: dscrScore,
    weight: 0.10,
    weighted: Math.round(dscrScore * 0.10),
    details: `DSCR: ${dscr.toFixed(2)}x. Min lender requirement: 1.25x.`,
  });

  // 5. Market Score (15% weight)
  const marketScore = macro
    ? clamp((macro.marketGrowthScore + macro.economicTrendScore) / 2, 0, 100)
    : 50;
  breakdown.push({
    category: "Market Fundamentals",
    score: Math.round(marketScore),
    weight: 0.15,
    weighted: Math.round(marketScore * 0.15),
    details: macro
      ? `Growth: ${macro.marketGrowthScore}/100, Economic: ${macro.economicTrendScore}/100.`
      : "No macro data available.",
  });

  // 6. Valuation Score (10% weight)
  const equityCreatedPct = valuation.equityCreated / (valuation.beforeValue || 1);
  const valuationScore = equityCreatedPct > 0
    ? clamp(50 + equityCreatedPct * 500, 50, 100)
    : clamp(50 + equityCreatedPct * 500, 0, 50);
  breakdown.push({
    category: "Value-Add Potential",
    score: Math.round(valuationScore),
    weight: 0.10,
    weighted: Math.round(valuationScore * 0.10),
    details: `Equity created: $${valuation.equityCreated.toLocaleString()} (${(equityCreatedPct * 100).toFixed(1)}%).`,
  });

  // 7. STR Market Depth (10% weight)
  const compCount = analysis.rentalComparables.length;
  const depthScore = compCount >= 8 ? 100 : compCount >= 6 ? 80 : compCount >= 4 ? 60 : compCount >= 2 ? 40 : 20;
  const occupancy = analysis.estimatedOccupancyRate * 100;
  const marketDepthScore = Math.round((depthScore * 0.5) + (clamp(occupancy / 80 * 100, 0, 100) * 0.5));
  breakdown.push({
    category: "STR Market Depth",
    score: marketDepthScore,
    weight: 0.10,
    weighted: Math.round(marketDepthScore * 0.10),
    details: `${compCount} comps, ${occupancy.toFixed(0)}% occupancy, ${analysis.confidence} confidence.`,
  });

  // 8. Risk Score (5% weight)
  const riskCount = analysis.assumptions.riskNotes.length;
  const renovationRisk = renovation.totalCapexEstimate > 100000 ? 20 : renovation.totalCapexEstimate > 50000 ? 10 : 0;
  const regulatoryRisk = macro?.strRegulationRisk ? macro.strRegulationRisk * 5 : 0;
  const riskScore = clamp(100 - riskCount * 15 - renovationRisk - regulatoryRisk, 0, 100);
  breakdown.push({
    category: "Risk Profile",
    score: Math.round(riskScore),
    weight: 0.05,
    weighted: Math.round(riskScore * 0.05),
    details: `${riskCount} risk notes. Renovation: $${renovation.totalCapexEstimate.toLocaleString()}.`,
  });

  const overallScore = breakdown.reduce((s, b) => s + b.weighted, 0);
  const grade = scoreToGrade(overallScore);

  // Radar chart data
  const radarData: RadarPoint[] = breakdown.map((b) => ({
    axis: b.category,
    value: b.score,
  }));

  // Generate strengths & weaknesses
  const sorted = [...breakdown].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3).map((b) => `${b.category}: ${b.details}`);
  const weaknesses = sorted.slice(-3).reverse().map((b) => `${b.category}: ${b.details}`);

  // Recommendation
  let recommendation: string;
  if (overallScore >= 80) {
    recommendation = `Strong Buy — This property scores ${overallScore}/100 (${grade}). Strong fundamentals across yield, cash flow, and market conditions. Consider fast-tracking to offer stage.`;
  } else if (overallScore >= 65) {
    recommendation = `Buy with Conditions — This property scores ${overallScore}/100 (${grade}). Solid potential but review the weaker areas before committing. Negotiate price if possible.`;
  } else if (overallScore >= 50) {
    recommendation = `Hold / Watch — This property scores ${overallScore}/100 (${grade}). Marginal returns. Monitor for price reductions or market shifts before acting.`;
  } else {
    recommendation = `Pass — This property scores ${overallScore}/100 (${grade}). Risk-adjusted returns do not justify investment at current terms.`;
  }

  return {
    propertyId: analysis.propertyId,
    overallScore: Math.round(overallScore),
    grade,
    breakdown,
    radarData,
    strengths,
    weaknesses,
    recommendation,
  };
}
