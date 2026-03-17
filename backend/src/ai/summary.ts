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
    const verdict =
      analysis.attractivenessScore >= 70
        ? "Promising"
        : analysis.attractivenessScore >= 50
          ? "Borderline"
          : "Caution";

    const upsideFactors = [
      `Estimated ADR is $${analysis.estimatedAdr.toFixed(0)} with occupancy at ${(analysis.estimatedOccupancyRate * 100).toFixed(1)}%.`,
      `Projected NOI is $${analysis.estimatedNetOperatingIncome.toLocaleString()} annually.`,
      `${analysis.marketMetrics.comparablesCount} local STR comparables support pricing confidence.`
    ];

    const downsideFactors = [
      `Operating costs are estimated at $${analysis.estimatedOperatingCost.toLocaleString()} annually.`,
      ...analysis.assumptions.riskNotes
    ];

    const assumptionsExplained = [
      `Monthly revenue formula: ADR × occupancy × ${analysis.assumptions.baseMonthlyDays} days.`,
      "Yield proxy formula: NOI ÷ purchase price.",
      `Assumes management fee ${(analysis.assumptions.managementFeeRate * 100).toFixed(0)}% and platform fee ${(analysis.assumptions.platformFeeRate * 100).toFixed(0)}%.`,
      `${property.propertyType} adjustment and bedroom-based adjustment were applied to base ADR.`
    ];

    return {
      verdict,
      upsideFactors,
      downsideFactors,
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
