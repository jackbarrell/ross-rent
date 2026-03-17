import {
  FinancialModel,
  FinancialModelYear,
  InvestmentAnalysis,
  MacroData,
  MortgageAssumptions,
  PropertyListing,
  RefinanceScenario,
} from "../models.js";

function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

function loanBalance(principal: number, annualRate: number, years: number, paymentsMade: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal - (principal / n) * paymentsMade;
  return (
    principal *
    (Math.pow(1 + r, n) - Math.pow(1 + r, paymentsMade)) /
    (Math.pow(1 + r, n) - 1)
  );
}

export function generateFinancialModel(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  renovationCost: number,
  macro: MacroData | null,
  mortgageOverrides?: Partial<MortgageAssumptions>
): FinancialModel {
  const mortgage: MortgageAssumptions = {
    ltv: 0.75,
    interestRate: 0.065,
    termYears: 30,
    ...mortgageOverrides,
  };

  const purchasePrice = property.listPrice;
  const downPayment = Math.round(purchasePrice * (1 - mortgage.ltv));
  const loan = Math.round(purchasePrice * mortgage.ltv);
  const monthly = monthlyPayment(loan, mortgage.interestRate, mortgage.termYears);
  const annualPayment = Math.round(monthly * 12);

  const revenueGrowth = 0.03;
  const costGrowth = 0.025;
  const appreciation = macro?.homePriceAppreciation ?? 0.035;

  const baseRevenue = analysis.estimatedAnnualGrossRevenue;
  const baseOpCost = analysis.estimatedOperatingCost;

  const years: FinancialModelYear[] = [];
  let cumulativeCashflow = -(downPayment + renovationCost);

  for (let y = 1; y <= 5; y++) {
    const revenue = Math.round(baseRevenue * Math.pow(1 + revenueGrowth, y - 1));
    const opCosts = Math.round(baseOpCost * Math.pow(1 + costGrowth, y - 1));
    const noi = revenue - opCosts;
    const cashflow = noi - annualPayment;
    const propertyValue = Math.round(
      (purchasePrice + renovationCost) * Math.pow(1 + appreciation, y)
    );
    const loanBal = Math.round(loanBalance(loan, mortgage.interestRate, mortgage.termYears, y * 12));
    const equity = propertyValue - loanBal;
    cumulativeCashflow += cashflow;

    years.push({
      year: y,
      grossRevenue: revenue,
      operatingCosts: opCosts,
      netOperatingIncome: noi,
      mortgagePayment: annualPayment,
      cashflow,
      propertyValue,
      loanBalance: loanBal,
      equity,
      cumulativeCashflow: Math.round(cumulativeCashflow),
    });
  }

  // ─── Refinance scenario at year 3 ───
  const y3Value = years[2].propertyValue;
  const y3Balance = years[2].loanBalance;
  const newLoan = Math.round(y3Value * 0.75);
  const equityOut = Math.max(0, newLoan - y3Balance);
  const refiRate = Math.max(0.04, mortgage.interestRate - 0.005);
  const newMonthly = monthlyPayment(newLoan, refiRate, 30);

  const refinanceScenario: RefinanceScenario = {
    refinanceYear: 3,
    newLoanAmount: newLoan,
    equityPulledOut: equityOut,
    newMonthlyPayment: Math.round(newMonthly),
    newAnnualPayment: Math.round(newMonthly * 12),
  };

  // ─── Simple IRR approximation ───
  const totalEquityIn = downPayment + renovationCost;
  const year5Equity = years[4].equity;
  const totalReturn = totalEquityIn > 0
    ? (year5Equity + cumulativeCashflow + totalEquityIn - totalEquityIn) / totalEquityIn
    : 0;
  const irr = totalReturn > -1 ? Math.pow(1 + totalReturn, 0.2) - 1 : 0;

  return {
    propertyId: property.id,
    purchasePrice,
    renovationCost,
    totalInvestment: purchasePrice + renovationCost,
    downPayment,
    loanAmount: loan,
    mortgageAssumptions: mortgage,
    annualMortgagePayment: annualPayment,
    years,
    refinanceScenario,
    irr: Math.round(irr * 10000) / 10000,
    totalReturn: Math.round(totalReturn * 10000) / 10000,
  };
}
