import { InvestmentAnalysis, PropertyListing } from "../models.js";

type SummaryShape = InvestmentAnalysis["aiSummary"];

export class AiSummaryService {
  constructor(
    private readonly apiKey?: string,
    private readonly model: string = "gpt-4o-mini"
  ) {}

  async summarize(property: PropertyListing, analysis: Omit<InvestmentAnalysis, "aiSummary">): Promise<SummaryShape> {
    if (this.apiKey) {
      try {
        return await this.generateWithLlm(property, analysis);
      } catch {
        return this.generateHeuristicSummary(property, analysis);
      }
    }

    return this.generateHeuristicSummary(property, analysis);
  }

  private generateHeuristicSummary(
    property: PropertyListing,
    analysis: Omit<InvestmentAnalysis, "aiSummary">
  ): SummaryShape {
    const yld = analysis.yieldProxy;
    const occ = analysis.estimatedOccupancyRate;
    const adr = analysis.estimatedAdr;
    const noi = analysis.estimatedNetOperatingIncome;
    const price = property.listPrice;
    const comps = analysis.rentalComparables;
    const monthlyRev = analysis.monthlyRevenue;

    // --- Verdict (nuanced) ---
    const verdict =
      analysis.attractivenessScore >= 75 ? "Promising"
        : analysis.attractivenessScore >= 55 ? "Promising"
          : analysis.attractivenessScore >= 40 ? "Borderline"
            : "Caution";

    // --- Upside Factors (data-driven) ---
    const upsideFactors: string[] = [];

    // Yield assessment
    if (yld >= 0.08) {
      upsideFactors.push(`Strong ${(yld * 100).toFixed(1)}% yield proxy — well above the 6% institutional benchmark, indicating high cash-flow potential.`);
    } else if (yld >= 0.05) {
      upsideFactors.push(`Solid ${(yld * 100).toFixed(1)}% yield proxy. Above the typical 4–5% threshold for STR investments in comparable markets.`);
    } else {
      upsideFactors.push(`Estimated ADR of $${adr.toFixed(0)} with ${(occ * 100).toFixed(0)}% occupancy generates $${analysis.estimatedMonthlyGrossRevenue.toLocaleString()}/mo gross revenue.`);
    }

    // Revenue seasonality insight
    if (monthlyRev.length > 0) {
      const peakMonth = monthlyRev.reduce((best, m) => m.revenue > best.revenue ? m : best);
      const lowMonth = monthlyRev.reduce((worst, m) => m.revenue < worst.revenue ? m : worst);
      const spread = ((peakMonth.revenue - lowMonth.revenue) / lowMonth.revenue * 100).toFixed(0);
      upsideFactors.push(`Peak season (${peakMonth.label}) generates $${peakMonth.revenue.toLocaleString()}/mo — ${spread}% above the low month (${lowMonth.label}: $${lowMonth.revenue.toLocaleString()}/mo).`);
    }

    // Market depth / comps insight
    if (comps.length >= 6) {
      const avgReviews = comps.reduce((s, c) => s + c.reviews, 0) / comps.length;
      upsideFactors.push(`${comps.length} local STR comparables with avg ${avgReviews.toFixed(0)} reviews indicates a proven, demand-validated market.`);
    } else if (comps.length >= 3) {
      upsideFactors.push(`${comps.length} comparable STRs found — moderate market depth. Less competition may support premium pricing.`);
    } else {
      upsideFactors.push(`Emerging market with limited comparables — early-mover advantage if STR demand materializes.`);
    }

    // Property-specific upside
    if (property.sqft > 1500 && property.bedrooms >= 3) {
      upsideFactors.push(`At ${property.sqft.toLocaleString()} sqft with ${property.bedrooms} bedrooms, this property can accommodate families and groups — the highest-RevPAR segment.`);
    }
    if (property.daysOnMarket > 30) {
      upsideFactors.push(`${property.daysOnMarket} days on market creates negotiation leverage — seller may accept below-ask offers.`);
    }
    if (noi > 0) {
      const cashOnCash = noi / (price * 0.25); // assuming 25% down
      if (cashOnCash > 0.08) {
        upsideFactors.push(`Estimated ${(cashOnCash * 100).toFixed(1)}% cash-on-cash return (25% down) — strong leveraged returns.`);
      }
    }

    // --- Downside Factors (data-driven) ---
    const downsideFactors: string[] = [];

    // Operating cost burden
    const costRatio = analysis.estimatedOperatingCost / analysis.estimatedAnnualGrossRevenue;
    if (costRatio > 0.55) {
      downsideFactors.push(`Operating costs consume ${(costRatio * 100).toFixed(0)}% of gross revenue — well above the 45% target. Management or maintenance costs may need optimization.`);
    } else if (costRatio > 0.45) {
      downsideFactors.push(`Operating cost ratio is ${(costRatio * 100).toFixed(0)}% of gross revenue — within normal range but worth monitoring.`);
    }

    // Confidence / data quality
    if (analysis.confidence === "Low") {
      downsideFactors.push(`Low confidence rating: only ${comps.length} comparable(s) found. ADR and occupancy estimates have wider error margins.`);
    } else if (analysis.confidence === "Medium") {
      downsideFactors.push(`Medium confidence: ${comps.length} comparables provide a reasonable but not robust market sample. Consider on-the-ground validation.`);
    }

    // Occupancy risk
    if (occ < 0.55) {
      downsideFactors.push(`Estimated ${(occ * 100).toFixed(0)}% occupancy is below the 60% breakeven threshold for most STR operators — vacancy risk is significant.`);
    } else if (occ < 0.65) {
      downsideFactors.push(`Occupancy estimate of ${(occ * 100).toFixed(0)}% leaves limited margin. Seasonal dips or new supply could push cash flow negative.`);
    }

    // Yield warning
    if (yld < 0.03) {
      downsideFactors.push(`${(yld * 100).toFixed(1)}% yield is below typical savings rates — the deal relies heavily on appreciation rather than cash flow.`);
    }

    // Price per sqft context
    const pricePerSqft = price / property.sqft;
    if (pricePerSqft > 400) {
      downsideFactors.push(`At $${pricePerSqft.toFixed(0)}/sqft, this property is in premium territory — limits margin of safety if market corrects.`);
    }

    // Risk notes from assumptions engine
    for (const note of analysis.assumptions.riskNotes) {
      downsideFactors.push(note);
    }

    // Ensure at least 2 downside factors
    if (downsideFactors.length < 2) {
      downsideFactors.push(`Property tax of $${analysis.costBreakdown.propertyTax.toLocaleString()}/yr (${(analysis.assumptions.taxRateAnnual * 100).toFixed(2)}% rate) is a fixed cost that will increase over time.`);
    }

    // --- Assumptions Explained (detailed) ---
    const assumptionsExplained: string[] = [];

    // Revenue model
    const bedroomAdj = 1 + (property.bedrooms - 3) * 0.04;
    const typeAdj = property.propertyType === "Condo" ? 0.95 : property.propertyType === "Townhome" ? 0.98 : 1.0;
    assumptionsExplained.push(
      `ADR derived from ${comps.length} local comps (avg $${analysis.marketMetrics.estimatedAdr.toFixed(0)}) with ${property.bedrooms}-bed adjustment (${bedroomAdj.toFixed(2)}×) and ${property.propertyType} factor (${typeAdj.toFixed(2)}×).`
    );

    assumptionsExplained.push(
      `Monthly revenue: ADR × occupancy × ${analysis.assumptions.baseMonthlyDays} nights, adjusted by regional seasonality curve (index ${analysis.assumptions.seasonalityIndex.toFixed(2)}).`
    );

    // Cost structure
    const mgmtPct = (analysis.assumptions.managementFeeRate * 100).toFixed(0);
    const platPct = (analysis.assumptions.platformFeeRate * 100).toFixed(0);
    const maintPct = (analysis.assumptions.maintenanceRate * 100).toFixed(0);
    assumptionsExplained.push(
      `Operating costs: ${mgmtPct}% management + ${platPct}% platform (Airbnb/Vrbo) + ${maintPct}% maintenance + $${analysis.assumptions.utilitiesMonthly}/mo utilities + $${analysis.assumptions.insuranceAnnual.toLocaleString()}/yr insurance.`
    );

    // Yield formula
    assumptionsExplained.push(
      `Yield proxy = NOI ($${noi.toLocaleString()}) ÷ total basis ($${price.toLocaleString()}) = ${(yld * 100).toFixed(2)}%. No leverage or appreciation included.`
    );

    // Scoring
    assumptionsExplained.push(
      `Attractiveness score (${analysis.attractivenessScore}/100) weights yield (50%), occupancy (25%), and comparable depth (15%), minus risk penalties.`
    );

    return {
      verdict,
      upsideFactors: upsideFactors.slice(0, 5),
      downsideFactors: downsideFactors.slice(0, 5),
      assumptionsExplained
    };
  }

  private async generateWithLlm(
    property: PropertyListing,
    analysis: Omit<InvestmentAnalysis, "aiSummary">
  ): Promise<SummaryShape> {
    const prompt = `You are an STR investment analyst. Return strict JSON with keys: verdict, upsideFactors (array of 3), downsideFactors (array of 3), assumptionsExplained (array of 3). Keep all items concise.\n\nProperty: ${property.address}, ${property.city} ${property.state}. Price: ${property.listPrice}.\nADR: ${analysis.estimatedAdr}. Occupancy: ${analysis.estimatedOccupancyRate}. NOI: ${analysis.estimatedNetOperatingIncome}. Yield proxy: ${analysis.yieldProxy}. Score: ${analysis.attractivenessScore}. Risks: ${analysis.assumptions.riskNotes.join(", ")}.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "analysis_summary",
            schema: {
              type: "object",
              properties: {
                verdict: { type: "string" },
                upsideFactors: { type: "array", items: { type: "string" } },
                downsideFactors: { type: "array", items: { type: "string" } },
                assumptionsExplained: { type: "array", items: { type: "string" } }
              },
              required: ["verdict", "upsideFactors", "downsideFactors", "assumptionsExplained"],
              additionalProperties: false
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error("AI provider request failed");
    }

    const payload = (await response.json()) as {
      output_text?: string;
    };

    if (!payload.output_text) {
      throw new Error("AI provider returned no output_text");
    }

    const parsed = JSON.parse(payload.output_text) as SummaryShape;
    return parsed;
  }
}
