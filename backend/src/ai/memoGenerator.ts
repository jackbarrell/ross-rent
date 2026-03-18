import {
  FinancialModel,
  InvestmentAnalysis,
  InvestmentMemo,
  MacroData,
  MemoSection,
  PropertyListing,
  RenovationEstimate,
  ValuationResult,
} from "../models.js";

function fmt$(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

export function generateInvestmentMemo(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  macro: MacroData | null,
  renovation: RenovationEstimate,
  valuation: ValuationResult,
  financialModel: FinancialModel
): InvestmentMemo {
  const sections: MemoSection[] = [];

  // 1. Property Overview
  sections.push({
    title: "Property Overview",
    content: [
      `**Address:** ${property.address}, ${property.city}, ${property.state} ${property.zip}`,
      `**Property Type:** ${property.propertyType}`,
      `**Specs:** ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms, ${property.sqft.toLocaleString()} sqft`,
      `**List Price:** ${fmt$(property.listPrice)}`,
      `**Days on Market:** ${property.daysOnMarket}`,
      "",
      property.description ?? "No description available.",
    ].join("\n"),
  });

  // 2. Market Analysis (Macro)
  if (macro) {
    sections.push({
      title: "Market Analysis",
      content: [
        `**Location:** ${macro.locationKey}`,
        `**Market Growth Score:** ${macro.marketGrowthScore} / 100`,
        `**Economic Trend Score:** ${macro.economicTrendScore} / 100`,
        "",
        `| Indicator | Value |`,
        `|-----------|-------|`,
        `| Population Growth | ${fmtPct(macro.populationGrowth)} |`,
        `| GDP Growth (proxy) | ${fmtPct(macro.gdpGrowthProxy)} |`,
        `| Tourism Demand Index | ${macro.tourismDemandIndex} / 10 |`,
        `| Home Price Appreciation | ${fmtPct(macro.homePriceAppreciation)} |`,
        `| Unemployment Rate | ${fmtPct(macro.unemploymentRate)} |`,
        `| Median Home Price | ${fmt$(macro.medianHomePrice)} |`,
        "",
        "**Key Notes:**",
        ...macro.notes.map((n) => `- ${n}`),
      ].join("\n"),
    });
  }

  // 3. STR Assumptions
  sections.push({
    title: "Short-Term Rental Assumptions",
    content: [
      `**Estimated ADR:** ${fmt$(analysis.estimatedAdr)}`,
      `**Estimated Occupancy:** ${fmtPct(analysis.estimatedOccupancyRate)}`,
      `**Monthly Gross Revenue:** ${fmt$(analysis.estimatedMonthlyGrossRevenue)}`,
      `**Annual Gross Revenue:** ${fmt$(analysis.estimatedAnnualGrossRevenue)}`,
      `**Comparables Used:** ${analysis.marketMetrics.comparablesCount}`,
      `**Confidence:** ${analysis.confidence}`,
      "",
      `Based on ${analysis.rentalComparables.length} comparable rentals in the ${analysis.locationKey} market. ` +
      `ADR adjusted for bedroom count and property type. Occupancy reflects local market conditions ` +
      `with a ${fmtPct(analysis.assumptions.vacancyBuffer)} vacancy buffer.`,
    ].join("\n"),
  });

  // 4. Renovation Plan
  sections.push({
    title: "Renovation Plan",
    content: [
      `**Methodology:** ${renovation.methodology === "description-analysis" ? "Description analysis (heuristic)" : "Manual specification"}`,
      `**Estimated Timeline:** ${renovation.timelineWeeks} weeks`,
      "",
      `| Work Item | Qty | Low | High | Estimate |`,
      `|-----------|-----|-----|------|----------|`,
      ...renovation.items.map(
        (i) =>
          `| ${i.label} | ${i.quantity} ${i.unit} | ${fmt$(i.lowCost)} | ${fmt$(i.highCost)} | ${fmt$(i.estimatedCost)} |`
      ),
      `| **Total** | | **${fmt$(renovation.totalCapexLow)}** | **${fmt$(renovation.totalCapexHigh)}** | **${fmt$(renovation.totalCapexEstimate)}** |`,
    ].join("\n"),
  });

  // 5. Valuation Uplift
  sections.push({
    title: "Valuation Uplift",
    content: [
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Before Value (as-is) | ${fmt$(valuation.beforeValue)} |`,
      `| Renovation Cost | ${fmt$(valuation.renovationCost)} |`,
      `| After Value (renovated) | ${fmt$(valuation.afterValue)} |`,
      `| **Equity Created** | **${fmt$(valuation.equityCreated)}** |`,
      `| Renovated $/sqft | ${fmt$(valuation.renovatedPricePerSqft)} |`,
      "",
      `*${valuation.methodology}*`,
    ].join("\n"),
  });

  // 6. Financial Projections (5-Year)
  sections.push({
    title: "Financial Projections (5-Year)",
    content: [
      `**Purchase Price:** ${fmt$(financialModel.purchasePrice)}`,
      `**Renovation Cost:** ${fmt$(financialModel.renovationCost)}`,
      `**Total Investment:** ${fmt$(financialModel.totalInvestment)}`,
      `**Down Payment:** ${fmt$(financialModel.downPayment)} (${fmtPct(1 - financialModel.mortgageAssumptions.ltv)})`,
      `**Loan Amount:** ${fmt$(financialModel.loanAmount)}`,
      `**Interest Rate:** ${fmtPct(financialModel.mortgageAssumptions.interestRate)}`,
      `**Estimated IRR:** ${fmtPct(financialModel.irr)}`,
      "",
      `| Year | Revenue | Op Costs | NOI | Mortgage | Cashflow | Property Value | Equity |`,
      `|------|---------|----------|-----|----------|----------|---------------|--------|`,
      ...financialModel.years.map(
        (y) =>
          `| ${y.year} | ${fmt$(y.grossRevenue)} | ${fmt$(y.operatingCosts)} | ${fmt$(y.netOperatingIncome)} | ${fmt$(y.mortgagePayment)} | ${fmt$(y.cashflow)} | ${fmt$(y.propertyValue)} | ${fmt$(y.equity)} |`
      ),
      "",
      "**Refinance Scenario (Year 3):**",
      `- New Loan: ${fmt$(financialModel.refinanceScenario.newLoanAmount)}`,
      `- Equity Pulled Out: ${fmt$(financialModel.refinanceScenario.equityPulledOut)}`,
      `- New Annual Payment: ${fmt$(financialModel.refinanceScenario.newAnnualPayment)}`,
    ].join("\n"),
  });

  // 7. Risks
  const risks: string[] = [
    ...analysis.aiSummary.downsideFactors,
  ];
  if (macro) {
    if (macro.crimeIndex > 5) risks.push("Above-average crime index may affect guest experience and reviews.");
    if (macro.unemploymentRate > 0.05) risks.push("Elevated local unemployment could weaken demand.");
  }
  if (analysis.confidence === "Low") {
    risks.push("Low confidence rating — limited comparable data available.");
  }
  if (valuation.equityCreated < 0) {
    risks.push("Negative equity on renovation — renovation costs exceed value uplift based on current comps.");
  }
  risks.push("STR regulations may change, impacting ability to operate.");
  risks.push("Interest rate sensitivity — refinance scenario assumes rates remain stable or decline.");

  sections.push({
    title: "Risks",
    content: risks.map((r) => `- ${r}`).join("\n"),
  });

  // 8. Assumptions
  sections.push({
    title: "Key Assumptions",
    content: [
      ...analysis.aiSummary.assumptionsExplained.map((a) => `- ${a}`),
      `- Revenue growth: 3% annually`,
      `- Operating cost growth: 2.5% annually`,
      `- Property appreciation: ${fmtPct(macro?.homePriceAppreciation ?? 0.035)} annually`,
      `- LTV: ${fmtPct(financialModel.mortgageAssumptions.ltv)}`,
      `- Mortgage rate: ${fmtPct(financialModel.mortgageAssumptions.interestRate)}`,
      `- Management fee: ${fmtPct(analysis.assumptions.managementFeeRate)} of revenue`,
      `- Platform fee: ${fmtPct(analysis.assumptions.platformFeeRate)} of revenue`,
      `- Property tax rate: ${fmtPct(analysis.assumptions.taxRateAnnual)} of total basis`,
      "",
      "*All STR market data and comparable sales are mock/synthetic for PoC purposes.*",
    ].join("\n"),
  });

  // ─── Compile full Markdown ───
  const md = [
    `# Investment Memo`,
    `## ${property.address}, ${property.city}, ${property.state}`,
    "",
    `*Generated on ${new Date().toISOString().split("T")[0]}*`,
    "",
    `---`,
    "",
    `**Verdict:** ${analysis.aiSummary.verdict} | **Score:** ${analysis.attractivenessScore}/100 | **Yield:** ${fmtPct(analysis.yieldProxy)} | **IRR:** ${fmtPct(financialModel.irr)}`,
    "",
    ...sections.flatMap((s) => [`---`, "", `## ${s.title}`, "", s.content, ""]),
    `---`,
    `*Generated by RossRent PoC — not financial advice.*`,
  ].join("\n");

  return {
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    sections,
    markdown: md,
  };
}
