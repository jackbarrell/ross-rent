import { ForecastVsActual, InvestmentAnalysis, OperationsSnapshot } from "../models.js";

/**
 * Compare predicted (from analysis engine) vs actual (from operations data).
 * Generate error metrics and an AI-style explanation.
 */
export function compareForecastVsActual(
  analysis: InvestmentAnalysis,
  operations: OperationsSnapshot
): ForecastVsActual {
  const predictedAdr = analysis.estimatedAdr;
  const actualAdr = operations.actualAdr;
  const adrErrorPct = predictedAdr > 0
    ? Math.round(((actualAdr - predictedAdr) / predictedAdr) * 1000) / 10
    : 0;

  const predictedOccupancy = analysis.estimatedOccupancyRate;
  const actualOccupancy = operations.actualOccupancy;
  const occupancyErrorPct = predictedOccupancy > 0
    ? Math.round(((actualOccupancy - predictedOccupancy) / predictedOccupancy) * 1000) / 10
    : 0;

  // Annualise actual revenue for comparison
  const monthsTracked = operations.monthlyBreakdown.length;
  const annualisedActualRevenue = monthsTracked > 0
    ? Math.round((operations.totalRevenue / monthsTracked) * 12)
    : 0;
  const predictedRevenue = analysis.estimatedAnnualGrossRevenue;
  const revenueErrorPct = predictedRevenue > 0
    ? Math.round(((annualisedActualRevenue - predictedRevenue) / predictedRevenue) * 1000) / 10
    : 0;

  // Generate heuristic explanation (AI layer)
  const explanationParts: string[] = [];
  const suggestions: string[] = [];

  if (adrErrorPct < -10) {
    explanationParts.push(
      `ADR came in ${Math.abs(adrErrorPct)}% below forecast ($${actualAdr.toFixed(0)} vs $${predictedAdr.toFixed(0)}). ` +
      `This may indicate aggressive pricing assumptions or competitive pressure from new listings in the area.`
    );
    suggestions.push("Lower ADR assumption by 10-15% to align with actual market rates.");
    suggestions.push("Review pricing strategy — consider dynamic pricing tools.");
  } else if (adrErrorPct > 10) {
    explanationParts.push(
      `ADR outperformed forecast by ${adrErrorPct}%. The property may be under-priced in projections ` +
      `or benefiting from seasonal/event premiums not captured in the baseline model.`
    );
    suggestions.push("Increase ADR assumption to reflect demonstrated pricing power.");
  } else {
    explanationParts.push(`ADR tracked close to forecast (${adrErrorPct > 0 ? "+" : ""}${adrErrorPct}%), indicating well-calibrated pricing assumptions.`);
  }

  if (occupancyErrorPct < -10) {
    explanationParts.push(
      `Occupancy was ${Math.abs(occupancyErrorPct)}% below predictions (${(actualOccupancy * 100).toFixed(1)}% vs ${(predictedOccupancy * 100).toFixed(1)}%). ` +
      `Possible causes: ramp-up period for new listing, seasonal low period, or increased local competition.`
    );
    suggestions.push("Increase vacancy buffer to account for actual ramp-up dynamics.");
    suggestions.push("Invest in listing optimisation (photos, description, amenities).");
  } else if (occupancyErrorPct > 10) {
    explanationParts.push(
      `Occupancy exceeded expectations by ${occupancyErrorPct}%. Strong demand signals — the property may be ` +
      `positioned to support higher ADR without sacrificing bookings.`
    );
    suggestions.push("Test 5-10% ADR increase to capture additional revenue.");
  } else {
    explanationParts.push(`Occupancy aligned with projections (${occupancyErrorPct > 0 ? "+" : ""}${occupancyErrorPct}%).`);
  }

  if (revenueErrorPct < -15) {
    explanationParts.push(
      `Overall annualised revenue gap of ${Math.abs(revenueErrorPct)}% suggests the original model was ` +
      `overly optimistic. Combined ADR and occupancy shortfalls are compounding.`
    );
    suggestions.push("Re-run financial model with updated ADR and occupancy inputs.");
    suggestions.push("Consider amenity upgrades (hot tub, game room) to differentiate listing.");
  } else if (revenueErrorPct > 15) {
    explanationParts.push(
      `Revenue outperformance of ${revenueErrorPct}% is encouraging. Consider using actual data ` +
      `to update the 5-year projection upward.`
    );
    suggestions.push("Update financial model with actuals — projected returns may be conservative.");
  }

  return {
    propertyId: analysis.propertyId,
    period: operations.period,
    predictedAdr,
    actualAdr,
    adrErrorPct,
    predictedOccupancy,
    actualOccupancy,
    occupancyErrorPct,
    predictedRevenue: Math.round(predictedRevenue),
    actualRevenue: annualisedActualRevenue,
    revenueErrorPct,
    aiExplanation: explanationParts.join(" "),
    adjustmentSuggestions: suggestions,
  };
}
