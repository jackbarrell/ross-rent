export interface PropertyListing {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  listPrice: number;
  propertyType: string;
  daysOnMarket: number;
  lat: number;
  lng: number;
  imageUrl?: string;
  description?: string;
}

export interface RentalComparable {
  id: string;
  source: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  adr: number;
  occupancyRate: number;
  reviews: number;
  distanceMiles: number;
  propertyType: string;
}

export interface MarketMetrics {
  comparablesCount: number;
  estimatedAdr: number;
  estimatedOccupancyRate: number;
  averageReviews: number;
  averageDistanceMiles: number;
}

export interface CostBreakdown {
  managementFees: number;
  maintenanceCosts: number;
  platformFees: number;
  capitalReserves: number;
  utilities: number;
  supplies: number;
  insurance: number;
  propertyTax: number;
  totalVariable: number;
  totalFixed: number;
  totalOperatingCost: number;
}

export interface AnalysisAssumptions {
  baseMonthlyDays: number;
  vacancyBuffer: number;
  adrOverride?: number;
  managementFeeRate: number;
  maintenanceRate: number;
  utilitiesMonthly: number;
  insuranceAnnual: number;
  taxRateAnnual: number;
  suppliesMonthly: number;
  platformFeeRate: number;
  capitalReserveRate: number;
  seasonalityIndex: number;
  monthlySeasonality?: number[];
  riskNotes: string[];
}

export interface MonthlyRevenue {
  month: number;
  label: string;
  adr: number;
  occupancy: number;
  revenue: number;
}

export interface InvestmentAnalysis {
  propertyId: string;
  locationKey: string;
  estimatedAdr: number;
  estimatedOccupancyRate: number;
  estimatedMonthlyGrossRevenue: number;
  estimatedAnnualGrossRevenue: number;
  estimatedOperatingCost: number;
  estimatedNetOperatingIncome: number;
  yieldProxy: number;
  attractivenessScore: number;
  confidence: "Low" | "Medium" | "High";
  marketMetrics: MarketMetrics;
  rentalComparables: RentalComparable[];
  costBreakdown: CostBreakdown;
  assumptions: AnalysisAssumptions;
  monthlyRevenue: MonthlyRevenue[];
  aiSummary: {
    verdict: string;
    upsideFactors: string[];
    downsideFactors: string[];
    assumptionsExplained: string[];
  };
}

export interface RankedProperty {
  propertyId: string;
  address: string;
  city: string;
  state: string;
  listPrice: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  attractivenessScore: number;
  yieldProxy: number;
  estimatedAdr: number;
  estimatedMonthlyGrossRevenue: number;
  estimatedNetOperatingIncome: number;
  confidence: string;
}

// ─── Macro Data ────────────────────────────────────────────

export interface MacroData {
  locationKey: string;
  populationGrowth: number;
  gdpGrowthProxy: number;
  tourismDemandIndex: number;
  medianHomePrice: number;
  homePriceAppreciation: number;
  unemploymentRate: number;
  crimeIndex: number;
  walkScore: number;
  economicTrendScore: number;
  marketGrowthScore: number;
  // Extended macro fields
  mortgageRate30yr?: number;
  cpiInflationRate?: number;
  buildingPermitGrowth?: number;
  medianHouseholdIncome?: number;
  rentalVacancyRate?: number;
  strRegulationRisk?: number;
  medianRent?: number;
  population?: number;
  employmentGrowth?: number;
  notes: string[];
}

// ─── Renovation ────────────────────────────────────────────

export interface CostLibraryItem {
  label: string;
  lowPerUnit: number;
  highPerUnit: number;
  unit: string;
  timelineDays: number;
}

export interface RenovationLineItem {
  category: string;
  label: string;
  quantity: number;
  unit: string;
  lowCost: number;
  highCost: number;
  estimatedCost: number;
  timelineDays: number;
}

export interface RenovationEstimate {
  propertyId: string;
  items: RenovationLineItem[];
  totalCapexLow: number;
  totalCapexHigh: number;
  totalCapexEstimate: number;
  timelineWeeks: number;
  methodology: string;
}

// ─── Valuation ─────────────────────────────────────────────

export interface ComparableSale {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  soldPrice: number;
  soldDate: string;
  qualityLevel: string;
  pricePerSqft: number;
}

export interface ValuationResult {
  propertyId: string;
  beforeValue: number;
  afterValue: number;
  renovationCost: number;
  equityCreated: number;
  comparablesUsed: ComparableSale[];
  renovatedPricePerSqft: number;
  methodology: string;
}

// ─── Financial Model ───────────────────────────────────────

export interface MortgageAssumptions {
  ltv: number;
  interestRate: number;
  termYears: number;
}

export interface FinancialModelYear {
  year: number;
  grossRevenue: number;
  operatingCosts: number;
  netOperatingIncome: number;
  mortgagePayment: number;
  cashflow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  cumulativeCashflow: number;
  cashOnCash: number;
  dscr: number;
}

export interface RefinanceScenario {
  refinanceYear: number;
  newLoanAmount: number;
  equityPulledOut: number;
  newMonthlyPayment: number;
  newAnnualPayment: number;
}

export interface FinancialModel {
  propertyId: string;
  purchasePrice: number;
  renovationCost: number;
  totalInvestment: number;
  downPayment: number;
  loanAmount: number;
  mortgageAssumptions: MortgageAssumptions;
  annualMortgagePayment: number;
  years: FinancialModelYear[];
  refinanceScenario: RefinanceScenario;
  irr: number;
  totalReturn: number;
  cashOnCash: number;
  dscr: number;
}

// ─── Investment Memo ───────────────────────────────────────

export interface MemoSection {
  title: string;
  content: string;
}

export interface InvestmentMemo {
  propertyId: string;
  generatedAt: string;
  sections: MemoSection[];
  markdown: string;
}

// ─── Operations ────────────────────────────────────────────

export interface MonthlyOperations {
  month: string;
  bookings: number;
  nights: number;
  revenue: number;
  adr: number;
  occupancy: number;
}

export interface OperationsSnapshot {
  propertyId: string;
  period: string;
  totalBookings: number;
  totalNights: number;
  totalRevenue: number;
  actualAdr: number;
  actualOccupancy: number;
  monthlyBreakdown: MonthlyOperations[];
  hasData: boolean;
}

// ─── Accounting ────────────────────────────────────────────

export interface AccountingEntry {
  id: string;
  propertyId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface PropertyPL {
  propertyId: string;
  address: string;
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  entries: AccountingEntry[];
}

export interface CompanyPL {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  propertyCount: number;
  properties: PropertyPL[];
}

// ─── Forecast vs Actual ────────────────────────────────────

export interface ForecastAdjustment {
  field: string;
  originalValue: number;
  suggestedValue: number;
  reason: string;
}

export interface ForecastVsActual {
  propertyId: string;
  period: string;
  predictedAdr: number;
  actualAdr: number;
  adrErrorPct: number;
  predictedOccupancy: number;
  actualOccupancy: number;
  occupancyErrorPct: number;
  predictedRevenue: number;
  actualRevenue: number;
  revenueErrorPct: number;
  aiExplanation: string;
  adjustmentSuggestions: string[];
  adjustedAssumptions: ForecastAdjustment[];
  hasData: boolean;
}

// ─── Portfolio ─────────────────────────────────────────────

export interface PortfolioProperty {
  propertyId: string;
  address: string;
  city: string;
  state: string;
  listPrice: number;
  estimatedRevenue: number;
  estimatedNoi: number;
  yieldProxy: number;
  score: number;
  hasOperationsData: boolean;
}

export interface PortfolioSummary {
  totalProperties: number;
  totalPortfolioValue: number;
  totalEstimatedRevenue: number;
  totalEstimatedNoi: number;
  averageYield: number;
  averageScore: number;
  properties: PortfolioProperty[];
}

// ─── Deal Pipeline ─────────────────────────────────────────

export type DealStatus = "watching" | "analyzing" | "under-offer" | "purchased" | "passed";

export interface SavedDeal {
  propertyId: string;
  status: DealStatus;
  notes: string;
  savedAt: string;
  updatedAt: string;
}

// ─── Comparison ────────────────────────────────────────────

export interface ComparisonRow {
  propertyId: string;
  address: string;
  city: string;
  state: string;
  listPrice: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  estimatedAdr: number;
  estimatedOccupancy: number;
  annualRevenue: number;
  noi: number;
  yieldProxy: number;
  score: number;
  irr: number;
  cashOnCash: number;
  dscr: number;
  renovationCost: number;
  equityCreated: number;
}

// ─── Sensitivity ───────────────────────────────────────────

export interface SensitivityResult {
  variable: string;
  scenarios: Array<{
    label: string;
    value: number;
    noi: number;
    cashflow: number;
    irr: number;
    cashOnCash: number;
  }>;
}

// ─── Monte Carlo ───────────────────────────────────────────

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

export interface MonteCarloResult {
  propertyId: string;
  simulations: number;
  irr: DistributionStats;
  cashOnCash: DistributionStats;
  year5Equity: DistributionStats;
  totalReturn: DistributionStats;
  noi: DistributionStats;
  probabilityOfLoss: number;
  probabilityAbove10Pct: number;
  percentiles: PercentileData[];
  histogram: HistogramBucket[];
}

// ─── Deal Score Card ───────────────────────────────────────

export type DealGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";

export interface DealScoreBreakdown {
  category: string;
  score: number;
  weight: number;
  weighted: number;
  details: string;
}

export interface RadarPoint {
  axis: string;
  value: number;
}

export interface DealScoreCard {
  propertyId: string;
  overallScore: number;
  grade: DealGrade;
  breakdown: DealScoreBreakdown[];
  radarData: RadarPoint[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

// ─── Break-Even Analysis ───────────────────────────────────

export interface BreakEvenAnalysis {
  propertyId: string;
  breakEvenOccupancy: number;
  breakEvenAdr: number;
  breakEvenPrice: number;
  currentOccupancy: number;
  currentAdr: number;
  currentPrice: number;
  safetyMarginOccupancy: number;
  safetyMarginAdr: number;
  daysToBreakEven: number;
}

// ─── Waterfall Analysis ────────────────────────────────────

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

// ─── Market Analytics ──────────────────────────────────────

export interface MarketAnalytics {
  locationKey: string;
  propertyCount: number;
  avgPrice: number;
  avgPricePerSqft: number;
  avgBedrooms: number;
  avgAdr: number;
  avgOccupancy: number;
  avgYield: number;
  avgScore: number;
  avgNoi: number;
  priceRange: { min: number; max: number };
  yieldRange: { min: number; max: number };
  scoreDistribution: { excellent: number; good: number; fair: number; poor: number };
  topProperties: Array<{ id: string; address: string; score: number; yield: number }>;
  macroHighlights: string[];
}

// ─── Portfolio Risk ────────────────────────────────────────

export interface AllocationSlice {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ConcentrationRisk {
  topPropertyPct: number;
  topLocationPct: number;
  propertyTypeConcentration: Record<string, number>;
  locationConcentration: Record<string, number>;
}

export interface PortfolioRiskMetrics {
  totalProperties: number;
  totalValue: number;
  totalEquity: number;
  weightedAvgYield: number;
  weightedAvgIrr: number;
  portfolioVolatility: number;
  concentrationRisk: ConcentrationRisk;
  riskRating: "Low" | "Moderate" | "High" | "Very High";
  diversificationScore: number;
  allocationBreakdown: AllocationSlice[];
  riskFactors: string[];
}

// ─── Sensitivity Heatmap ───────────────────────────────────

export interface HeatmapCell {
  adrMultiplier: number;
  occupancyMultiplier: number;
  irr: number;
  noi: number;
  cashflow: number;
}

export interface SensitivityHeatmap {
  propertyId: string;
  adrSteps: number[];
  occupancySteps: number[];
  cells: HeatmapCell[];
  baseAdr: number;
  baseOccupancy: number;
}
