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
