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

/**
 * Compute IRR via Newton-Raphson on NPV of annual cashflows.
 * cashflows[0] = initial outlay (negative), cashflows[1..n] = annual net.
 * Terminal value (sale proceeds - loan payoff) added to final year.
 */
export function computeIrr(cashflows: number[], maxIter = 100, tolerance = 1e-6): number {
  let guess = 0.10;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const discountFactor = Math.pow(1 + guess, t);
      npv += cashflows[t] / discountFactor;
      if (t > 0) dNpv -= (t * cashflows[t]) / Math.pow(1 + guess, t + 1);
    }
    if (Math.abs(dNpv) < 1e-12) break;
    const newGuess = guess - npv / dNpv;
    if (!isFinite(newGuess) || newGuess < -1) break;
    if (Math.abs(newGuess - guess) < tolerance) return newGuess;
    guess = newGuess;
  }
  // Fallback: simple annualised return if Newton-Raphson didn't converge
  if (!isFinite(guess) || guess < -1 || guess > 10) {
    const totalReturn = cashflows.reduce((s, c) => s + c, 0);
    const initial = Math.abs(cashflows[0]);
    if (initial === 0) return 0;
    return Math.pow(1 + totalReturn / initial, 1 / (cashflows.length - 1)) - 1;
  }
  return guess;
}

export interface FinancialModelConfig {
  revenueGrowth?: number;
  costGrowth?: number;
  appreciationOverride?: number;
}

export function generateFinancialModel(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  renovationCost: number,
  macro: MacroData | null,
  mortgageOverrides?: Partial<MortgageAssumptions>,
  config?: FinancialModelConfig
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
  const originalAnnualPayment = Math.round(monthly * 12);

  const revenueGrowth = config?.revenueGrowth ?? 0.03;
  const costGrowth = config?.costGrowth ?? 0.025;
  const appreciation = config?.appreciationOverride ?? macro?.homePriceAppreciation ?? 0.035;

  const baseRevenue = analysis.estimatedAnnualGrossRevenue;
  const baseOpCost = analysis.estimatedOperatingCost;

  // ─── Compute refinance scenario first so we can apply it to years 4-5 ───
  const refiRate = Math.max(0.04, mortgage.interestRate - 0.005);

  // Calculate year 3 property value and loan balance for refinance
  const y3PropertyValue = Math.round(
    (purchasePrice + renovationCost) * Math.pow(1 + appreciation, 3)
  );
  const y3LoanBalance = Math.round(loanBalance(loan, mortgage.interestRate, mortgage.termYears, 3 * 12));
  const newLoan = Math.round(y3PropertyValue * 0.75);
  const equityOut = Math.max(0, newLoan - y3LoanBalance);
  const refiMonthly = monthlyPayment(newLoan, refiRate, 30);
  const refiAnnualPayment = Math.round(refiMonthly * 12);

  const refinanceScenario: RefinanceScenario = {
    refinanceYear: 3,
    newLoanAmount: newLoan,
    equityPulledOut: equityOut,
    newMonthlyPayment: Math.round(refiMonthly),
    newAnnualPayment: refiAnnualPayment,
  };

  // ─── Build 5-year projections with refinance integrated ───
  const years: FinancialModelYear[] = [];
  const totalEquityIn = downPayment + renovationCost;
  let cumulativeCashflow = -totalEquityIn;

  for (let y = 1; y <= 5; y++) {
    const revenue = Math.round(baseRevenue * Math.pow(1 + revenueGrowth, y - 1));
    const opCosts = Math.round(baseOpCost * Math.pow(1 + costGrowth, y - 1));
    const noi = revenue - opCosts;

    // After refinance at year 3, years 4-5 use refi mortgage payment and loan balance
    const isPostRefi = y > 3;
    const currentAnnualPayment = isPostRefi ? refiAnnualPayment : originalAnnualPayment;
    const cashflow = noi - currentAnnualPayment;

    const propertyValue = Math.round(
      (purchasePrice + renovationCost) * Math.pow(1 + appreciation, y)
    );

    let loanBal: number;
    if (isPostRefi) {
      // Post-refinance: loan balance on the new loan
      const refiPaymentsMade = (y - 3) * 12;
      loanBal = Math.round(loanBalance(newLoan, refiRate, 30, refiPaymentsMade));
    } else {
      loanBal = Math.round(loanBalance(loan, mortgage.interestRate, mortgage.termYears, y * 12));
    }

    const equity = propertyValue - loanBal;
    cumulativeCashflow += cashflow;

    // Cash-on-Cash = annual pre-tax cashflow / total cash invested
    const cashOnCash = totalEquityIn > 0 ? Math.round((cashflow / totalEquityIn) * 10000) / 10000 : 0;
    // DSCR = NOI / annual debt service
    const dscr = currentAnnualPayment > 0 ? Math.round((noi / currentAnnualPayment) * 100) / 100 : 0;

    years.push({
      year: y,
      grossRevenue: revenue,
      operatingCosts: opCosts,
      netOperatingIncome: noi,
      mortgagePayment: currentAnnualPayment,
      cashflow,
      propertyValue,
      loanBalance: loanBal,
      equity,
      cumulativeCashflow: Math.round(cumulativeCashflow),
      cashOnCash,
      dscr,
    });
  }

  // ─── True IRR via Newton-Raphson ───
  // Cash flows: year 0 = -(downPayment + renovationCost), years 1-4 = cashflow,
  // year 5 = cashflow + terminal equity (property value - loan balance)
  const irrCashflows = [
    -(downPayment + renovationCost),
    ...years.slice(0, 4).map((y) => y.cashflow),
    years[4].cashflow + years[4].propertyValue - years[4].loanBalance,
  ];
  const irr = computeIrr(irrCashflows);

  const totalReturn = totalEquityIn > 0
    ? (years[4].equity + cumulativeCashflow) / totalEquityIn - 1
    : 0;

  // Year-1 metrics for summary
  const y1CashOnCash = years[0].cashOnCash;
  const y1Dscr = years[0].dscr;

  return {
    propertyId: property.id,
    purchasePrice,
    renovationCost,
    totalInvestment: purchasePrice + renovationCost,
    downPayment,
    loanAmount: loan,
    mortgageAssumptions: mortgage,
    annualMortgagePayment: originalAnnualPayment,
    years,
    refinanceScenario,
    irr: Math.round(irr * 10000) / 10000,
    totalReturn: Math.round(totalReturn * 10000) / 10000,
    cashOnCash: y1CashOnCash,
    dscr: y1Dscr,
  };
}
