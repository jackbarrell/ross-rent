import {
  AnalysisAssumptions,
  BreakEvenAnalysis,
  CompanyPL,
  ComparisonRow,
  CostLibraryItem,
  DealScoreCard,
  DealStatus,
  FinancialModel,
  ForecastVsActual,
  InvestmentAnalysis,
  InvestmentMemo,
  MacroData,
  MarketAnalytics,
  MonteCarloResult,
  OperationsSnapshot,
  PortfolioRiskMetrics,
  PortfolioSummary,
  PropertyListing,
  PropertyPL,
  RankedProperty,
  RenovationEstimate,
  SavedDeal,
  SensitivityHeatmap,
  SensitivityResult,
  ValuationResult,
  WaterfallAnalysis,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API request failed: ${path}`);
  }
  return (await res.json()) as T;
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${path}`);
  }
  return (await res.json()) as T;
};

export const fetchLocations = async () => {
  return getJson<{ locations: string[] }>("/api/locations");
};

export const fetchProperties = async (location: string) => {
  const query = location ? `?location=${encodeURIComponent(location)}` : "";
  return getJson<{ properties: PropertyListing[] }>(`/api/properties${query}`);
};

export const fetchProperty = async (id: string) => {
  return getJson<{ property: PropertyListing }>(`/api/properties/${id}`);
};

export const fetchAnalysis = async (id: string) => {
  return getJson<{ property: PropertyListing; analysis: InvestmentAnalysis }>(`/api/analysis/${id}`);
};

export const fetchAnalysisWithOverrides = async (
  id: string,
  assumptions?: Partial<AnalysisAssumptions>,
  renovationCost?: number
) => {
  return postJson<{ property: PropertyListing; analysis: InvestmentAnalysis }>(`/api/analysis/${id}`, {
    assumptions,
    renovationCost
  });
};

export const fetchRanking = async (location: string) => {
  const query = location ? `?location=${encodeURIComponent(location)}` : "";
  return getJson<{ ranked: RankedProperty[] }>(`/api/ranking${query}`);
};

export const fetchMacroData = async (locationKey: string) => {
  return getJson<MacroData>(`/api/macro/${encodeURIComponent(locationKey)}`);
};

export const fetchRenovation = async (propertyId: string) => {
  return getJson<RenovationEstimate>(`/api/renovation/${propertyId}`);
};

export const fetchRenovationCustom = async (
  propertyId: string,
  items: Array<{ category: string; quantity: number }>
) => {
  return postJson<RenovationEstimate>(`/api/renovation/${propertyId}`, { items });
};

export const fetchValuation = async (propertyId: string, renovationCost?: number) => {
  const query = renovationCost ? `?renovationCost=${renovationCost}` : "";
  return getJson<ValuationResult>(`/api/valuation/${propertyId}${query}`);
};

export const fetchFinancialModel = async (propertyId: string, renovationCost?: number) => {
  const query = renovationCost ? `?renovationCost=${renovationCost}` : "";
  return getJson<FinancialModel>(`/api/financial-model/${propertyId}${query}`);
};

export const fetchMemo = async (propertyId: string) => {
  return getJson<InvestmentMemo>(`/api/memo/${propertyId}`);
};

export const fetchOperations = async (propertyId: string) => {
  return getJson<OperationsSnapshot & { hasData: boolean }>(`/api/operations/${propertyId}`);
};

export const fetchCompanyAccounting = async () => {
  return getJson<CompanyPL>("/api/accounting");
};

export const fetchPropertyAccounting = async (propertyId: string) => {
  return getJson<PropertyPL>(`/api/accounting/${propertyId}`);
};

export const fetchForecastVsActual = async (propertyId: string) => {
  return getJson<ForecastVsActual & { hasData: boolean }>(`/api/forecast-vs-actual/${propertyId}`);
};

export const fetchPortfolio = async () => {
  return getJson<PortfolioSummary>("/api/portfolio");
};

// ─── Deal Pipeline ─────────────────────────────────────────

export const fetchDeals = async () => {
  return getJson<{ deals: SavedDeal[] }>("/api/deals");
};

export const saveDeal = async (propertyId: string, status?: DealStatus, notes?: string) => {
  return postJson<SavedDeal>("/api/deals", { propertyId, status, notes });
};

export const removeDeal = async (propertyId: string) => {
  const res = await fetch(`${API_BASE}/api/deals/${propertyId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove deal");
  return res.json();
};

// ─── Comparison ────────────────────────────────────────────

export const fetchComparison = async (propertyIds: string[]) => {
  return postJson<{ comparisons: ComparisonRow[] }>("/api/compare", { propertyIds });
};

// ─── Sensitivity ───────────────────────────────────────────

export const fetchSensitivity = async (propertyId: string) => {
  return getJson<{ sensitivity: SensitivityResult[] }>(`/api/sensitivity/${propertyId}`);
};

// ─── Cost Library ──────────────────────────────────────────

export const fetchCostLibrary = async () => {
  return getJson<Record<string, CostLibraryItem>>("/api/cost-library");
};

// ─── Forecast Calibration ──────────────────────────────────

export const applyForecastCalibration = async (propertyId: string) => {
  return postJson<{ applied: unknown[]; calibratedAnalysis: InvestmentAnalysis }>(
    `/api/forecast-vs-actual/${propertyId}/apply`,
    {}
  );
};

// ─── Monte Carlo ───────────────────────────────────────────

export const fetchMonteCarlo = async (propertyId: string) => {
  return getJson<MonteCarloResult>(`/api/monte-carlo/${propertyId}`);
};

// ─── Deal Score Card ───────────────────────────────────────

export const fetchDealScore = async (propertyId: string) => {
  return getJson<DealScoreCard>(`/api/deal-score/${propertyId}`);
};

// ─── Break-Even Analysis ───────────────────────────────────

export const fetchBreakEven = async (propertyId: string) => {
  return getJson<BreakEvenAnalysis>(`/api/break-even/${propertyId}`);
};

// ─── Waterfall Analysis ────────────────────────────────────

export const fetchWaterfall = async (propertyId: string) => {
  return getJson<WaterfallAnalysis>(`/api/waterfall/${propertyId}`);
};

// ─── Market Analytics ──────────────────────────────────────

export const fetchMarketAnalytics = async (locationKey: string) => {
  return getJson<MarketAnalytics>(`/api/market-analytics/${encodeURIComponent(locationKey)}`);
};

export const fetchAllMarketAnalytics = async () => {
  return getJson<{ markets: MarketAnalytics[] }>("/api/market-analytics");
};

// ─── Portfolio Risk ────────────────────────────────────────

export const fetchPortfolioRisk = async () => {
  return getJson<PortfolioRiskMetrics>("/api/portfolio-risk");
};

// ─── Sensitivity Heatmap ───────────────────────────────────

export const fetchHeatmap = async (propertyId: string) => {
  return getJson<SensitivityHeatmap>(`/api/heatmap/${propertyId}`);
};
