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
  locationKey: string;
  source: "Airbnb" | "Vrbo" | "Other";
  name: string;
  bedrooms: number;
  bathrooms: number;
  adr: number;
  occupancyRate: number;
  reviews: number;
  distanceMiles: number;
  propertyType: string;
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

export interface MarketMetrics {
  locationKey: string;
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
  assumptions: AnalysisAssumptions;
  costBreakdown: CostBreakdown;
  marketMetrics: MarketMetrics;
  rentalComparables: RentalComparable[];
  monthlyRevenue: MonthlyRevenue[];
  aiSummary: {
    verdict: string;
    upsideFactors: string[];
    downsideFactors: string[];
    assumptionsExplained: string[];
  };
}

// ─── Module 3: Macro / Geography Data ──────────────────────

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
  notes: string[];
}

// ─── Module 4: Renovation Cost Engine ──────────────────────

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
  methodology: "description-analysis" | "manual";
}

// ─── Module 5: Post-Renovation Valuation ───────────────────

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
  qualityLevel: "original" | "updated" | "renovated";
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

// ─── Module 6: Financial Model (5-Year) ────────────────────

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

// ─── Module 7: Investment Memo ─────────────────────────────

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

// ─── Module 8: Operations Layer ────────────────────────────

export interface BookingRecord {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  revenue: number;
  source: string;
  guestName: string;
}

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
}

// ─── Module 9: Accounting Integration ──────────────────────

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

// ─── Module 10: Forecast vs Actual ─────────────────────────

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

// ─── Property Comparison ───────────────────────────────────

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

// ─── Sensitivity Analysis ──────────────────────────────────

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
