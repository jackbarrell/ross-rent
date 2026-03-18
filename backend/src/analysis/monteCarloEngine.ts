import { InvestmentAnalysis, PropertyListing, MacroData } from "../models.js";
import { generateFinancialModel, computeIrr } from "../providers/financialModelEngine.js";

export interface MonteCarloConfig {
  simulations: number;
  adrStdDev: number;       // e.g. 0.15 = 15% std deviation
  occupancyStdDev: number; // e.g. 0.10
  appreciationStdDev: number;
  costGrowthStdDev: number;
  interestRateStdDev: number;
}

export interface MonteCarloResult {
  propertyId: string;
  simulations: number;
  irr: DistributionStats;
  cashOnCash: DistributionStats;
  year5Equity: DistributionStats;
  totalReturn: DistributionStats;
  noi: DistributionStats;
  probabilityOfLoss: number;     // % of sims with negative total return
  probabilityAbove10Pct: number; // % of sims with IRR > 10%
  percentiles: PercentileData[];
  histogram: HistogramBucket[];
}

export interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  min: number;
  max: number;
}

export interface PercentileData {
  percentile: number;
  irr: number;
  totalReturn: number;
  equity: number;
}

export interface HistogramBucket {
  rangeLabel: string;
  min: number;
  max: number;
  count: number;
  frequency: number;
}

const DEFAULT_CONFIG: MonteCarloConfig = {
  simulations: 1000,
  adrStdDev: 0.12,
  occupancyStdDev: 0.08,
  appreciationStdDev: 0.02,
  costGrowthStdDev: 0.01,
  interestRateStdDev: 0.005,
};

// Box-Muller transform for normal distribution
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStats(values: number[]): DistributionStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return {
    mean: round4(mean),
    median: round4(percentile(sorted, 50)),
    stdDev: round4(Math.sqrt(variance)),
    p5: round4(percentile(sorted, 5)),
    p25: round4(percentile(sorted, 25)),
    p75: round4(percentile(sorted, 75)),
    p95: round4(percentile(sorted, 95)),
    min: round4(sorted[0]),
    max: round4(sorted[n - 1]),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function runMonteCarlo(
  property: PropertyListing,
  analysis: InvestmentAnalysis,
  renovationCost: number,
  macro: MacroData | null,
  config: Partial<MonteCarloConfig> = {},
): MonteCarloResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const baseAdr = analysis.estimatedAdr;
  const baseOcc = analysis.estimatedOccupancyRate;
  const baseAppreciation = macro?.homePriceAppreciation ?? 0.035;
  const baseCostGrowth = 0.025;
  const baseRate = 0.065;

  const irrs: number[] = [];
  const cocs: number[] = [];
  const equities: number[] = [];
  const totalReturns: number[] = [];
  const nois: number[] = [];

  for (let i = 0; i < cfg.simulations; i++) {
    // Randomize inputs
    const simAdr = clamp(normalRandom(baseAdr, baseAdr * cfg.adrStdDev), baseAdr * 0.5, baseAdr * 1.8);
    const simOcc = clamp(normalRandom(baseOcc, cfg.occupancyStdDev), 0.2, 0.95);
    const simAppreciation = clamp(normalRandom(baseAppreciation, cfg.appreciationStdDev), -0.05, 0.15);
    const simCostGrowth = clamp(normalRandom(baseCostGrowth, cfg.costGrowthStdDev), 0.005, 0.06);
    const simRate = clamp(normalRandom(baseRate, cfg.interestRateStdDev), 0.03, 0.10);

    // Calculate simulated revenue
    const simAnnualRevenue = simAdr * simOcc * 365;
    const simOpCost = analysis.estimatedOperatingCost * (simAnnualRevenue / analysis.estimatedAnnualGrossRevenue);
    const simNoi = simAnnualRevenue - simOpCost;

    // Build simplified 5-year cashflows
    const purchasePrice = property.listPrice;
    const ltv = 0.75;
    const downPayment = Math.round(purchasePrice * (1 - ltv));
    const loan = Math.round(purchasePrice * ltv);
    const r = simRate / 12;
    const n = 360;
    const monthlyPmt = r === 0 ? loan / n : (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    const annualDebt = monthlyPmt * 12;

    const totalEquityIn = downPayment + renovationCost;
    const cashflows: number[] = [-(totalEquityIn)];

    let y5Equity = 0;
    let y1Noi = 0;

    for (let y = 1; y <= 5; y++) {
      const rev = Math.round(simAnnualRevenue * Math.pow(1 + 0.03, y - 1));
      const cost = Math.round(simOpCost * Math.pow(1 + simCostGrowth, y - 1));
      const noi = rev - cost;
      const cf = noi - annualDebt;

      if (y === 1) y1Noi = noi;

      if (y === 5) {
        const propValue = Math.round((purchasePrice + renovationCost) * Math.pow(1 + simAppreciation, 5));
        const paymentsMade = 60;
        const loanBal = r === 0
          ? loan - (loan / n) * paymentsMade
          : loan * (Math.pow(1 + r, n) - Math.pow(1 + r, paymentsMade)) / (Math.pow(1 + r, n) - 1);
        y5Equity = propValue - loanBal;
        cashflows.push(cf + propValue - loanBal);
      } else {
        cashflows.push(cf);
      }
    }

    const irr = computeIrr(cashflows);
    const totalReturn = totalEquityIn > 0 ? (cashflows.reduce((s, c) => s + c, 0)) / totalEquityIn : 0;
    const coc = totalEquityIn > 0 ? (cashflows[1]) / totalEquityIn : 0;

    irrs.push(irr);
    cocs.push(coc);
    equities.push(y5Equity);
    totalReturns.push(totalReturn);
    nois.push(y1Noi);
  }

  // Build histogram for IRR
  const irrSorted = [...irrs].sort((a, b) => a - b);
  const histMin = Math.floor(irrSorted[0] * 100) / 100;
  const histMax = Math.ceil(irrSorted[irrSorted.length - 1] * 100) / 100;
  const bucketCount = 20;
  const bucketWidth = (histMax - histMin) / bucketCount || 0.01;
  const histogram: HistogramBucket[] = [];
  for (let b = 0; b < bucketCount; b++) {
    const bMin = histMin + b * bucketWidth;
    const bMax = bMin + bucketWidth;
    const count = irrs.filter((v) => v >= bMin && (b === bucketCount - 1 ? v <= bMax : v < bMax)).length;
    histogram.push({
      rangeLabel: `${(bMin * 100).toFixed(1)}%–${(bMax * 100).toFixed(1)}%`,
      min: round4(bMin),
      max: round4(bMax),
      count,
      frequency: round4(count / cfg.simulations),
    });
  }

  // Percentile data
  const irrStats = computeStats(irrs);
  const trStats = computeStats(totalReturns);
  const eqStats = computeStats(equities);

  const percentiles: PercentileData[] = [5, 10, 25, 50, 75, 90, 95].map((p) => ({
    percentile: p,
    irr: round4(percentile(irrSorted, p)),
    totalReturn: round4(percentile([...totalReturns].sort((a, b) => a - b), p)),
    equity: Math.round(percentile([...equities].sort((a, b) => a - b), p)),
  }));

  return {
    propertyId: property.id,
    simulations: cfg.simulations,
    irr: irrStats,
    cashOnCash: computeStats(cocs),
    year5Equity: eqStats,
    totalReturn: trStats,
    noi: computeStats(nois),
    probabilityOfLoss: round4(totalReturns.filter((r) => r < 0).length / cfg.simulations),
    probabilityAbove10Pct: round4(irrs.filter((r) => r > 0.10).length / cfg.simulations),
    percentiles,
    histogram,
  };
}
