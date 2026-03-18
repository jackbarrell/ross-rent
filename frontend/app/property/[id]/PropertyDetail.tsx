"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { MacroPanel } from "@/components/MacroPanel";
import { RenovationPanel } from "@/components/RenovationPanel";
import { ValuationPanel } from "@/components/ValuationPanel";
import { FinancialModelPanel } from "@/components/FinancialModelPanel";
import { MemoPanel } from "@/components/MemoPanel";
import { OperationsPanel } from "@/components/OperationsPanel";
import { ForecastPanel } from "@/components/ForecastPanel";
import { SensitivityPanel } from "@/components/SensitivityPanel";
import { RevenueChart } from "@/components/RevenueChart";
import { MonteCarloPanel } from "@/components/MonteCarloPanel";
import { DealScorePanel } from "@/components/DealScorePanel";
import { HeatmapPanel } from "@/components/HeatmapPanel";
import { WaterfallPanel } from "@/components/WaterfallPanel";
import { fetchAnalysis, fetchAnalysisWithOverrides, saveDeal, fetchDeals } from "@/lib/api";
import { AnalysisAssumptions, DealStatus, InvestmentAnalysis, PropertyListing } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

type Tab = "market" | "macro" | "renovation" | "valuation" | "financials" | "waterfall" | "sensitivity" | "heatmap" | "montecarlo" | "dealscore" | "memo" | "operations" | "forecast";

interface TabGroup {
  label: string;
  tabs: { key: Tab; label: string; ai?: boolean }[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    label: "Analysis",
    tabs: [
      { key: "market", label: "STR Market" },
      { key: "dealscore", label: "Deal Score", ai: true },
      { key: "macro", label: "Macro" },
    ],
  },
  {
    label: "Investment",
    tabs: [
      { key: "renovation", label: "Renovation", ai: true },
      { key: "valuation", label: "Valuation" },
      { key: "financials", label: "Financials" },
    ],
  },
  {
    label: "Risk Models",
    tabs: [
      { key: "waterfall", label: "Waterfall" },
      { key: "sensitivity", label: "Sensitivity" },
      { key: "heatmap", label: "Heatmap" },
      { key: "montecarlo", label: "Monte Carlo", ai: true },
    ],
  },
  {
    label: "Operations",
    tabs: [
      { key: "operations", label: "Ops" },
      { key: "forecast", label: "Forecast", ai: true },
      { key: "memo", label: "Memo", ai: true },
    ],
  },
];

export function PropertyDetail({ id }: { id: string }) {
  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [analysis, setAnalysis] = useState<InvestmentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("market");

  // Scenario editor state
  const [renovationCost, setRenovationCost] = useState(0);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [overrides, setOverrides] = useState<Partial<AnalysisAssumptions>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Deal pipeline state
  const [dealStatus, setDealStatus] = useState<DealStatus | null>(null);
  const [savingDeal, setSavingDeal] = useState(false);

  useEffect(() => {
    fetchAnalysis(id)
      .then((r) => { setProperty(r.property); setAnalysis(r.analysis); })
      .catch(() => setError("Could not load property analysis."))
      .finally(() => setLoading(false));
    // Check if property is in deal pipeline
    fetchDeals().then((d) => {
      const deal = d.deals.find((x) => x.propertyId === id);
      if (deal) setDealStatus(deal.status);
    }).catch(() => {});
  }, [id]);

  const recalculate = useCallback(async () => {
    if (Object.keys(overrides).length === 0 && renovationCost === 0) return;
    try {
      setIsRecalculating(true);
      const r = await fetchAnalysisWithOverrides(id, overrides, renovationCost);
      setAnalysis(r.analysis);
    } catch {} finally { setIsRecalculating(false); }
  }, [id, overrides, renovationCost]);

  const handleOverride = (key: keyof AnalysisAssumptions, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  if (error) return (
    <div className="pageStack"><Link href="/" className="backLink">← Back</Link><p className="error">{error}</p></div>
  );
  if (loading || !property || !analysis) return (
    <div className="pageStack fadeIn">
      <Link href="/" className="backLink">← Back</Link>
      <div className="skeleton skeletonBlock" />
      <div className="skeleton skeletonBlock" />
      <div className="skeleton" style={{ height: 40, width: 200 }} />
    </div>
  );

  const a = analysis;
  const cb = a.costBreakdown;
  const locationKey = `${property.city},${property.state}`;

  return (
    <div className="pageStack fadeIn">
        <Link href="/" className="backLink">← Back to property list</Link>

        {/* ─── Property Header ─── */}
        {property.imageUrl && (
          <div className="propertyHeroImage">
            <img src={property.imageUrl} alt={property.address} />
          </div>
        )}
        <section className="panel">
          <div className="propertyHeader">
            <div>
              <h1>{property.address}</h1>
              <p className="propertyMeta">{property.city}, {property.state} {property.zip}</p>
              <p className="propertySpecs">
                {property.bedrooms} bd · {property.bathrooms} ba · {property.sqft.toLocaleString()} sqft · {property.daysOnMarket} DOM
              </p>
            </div>
            <div className="priceBlock">
              <span className="bigPrice">{fmt$(property.listPrice)}</span>
              <span className="pill">{property.propertyType}</span>
              <div className={`verdictBadge verdict${a.aiSummary.verdict}`}>
                <span className="navBrandDot" style={{ width: 6, height: 6 }} />
                {a.aiSummary.verdict}
              </div>
              <button
                className={dealStatus ? "btnSecondary" : "btnPrimary"}
                style={{ marginTop: 8 }}
                disabled={savingDeal}
                onClick={async () => {
                  setSavingDeal(true);
                  try {
                    const newStatus: DealStatus = dealStatus === "watching" ? "analyzing" : dealStatus === "analyzing" ? "under-offer" : "watching";
                    await saveDeal(id, newStatus);
                    setDealStatus(newStatus);
                  } catch {} finally { setSavingDeal(false); }
                }}
              >
                {dealStatus ? `Pipeline: ${dealStatus}` : "＋ Save to Pipeline"}
              </button>
            </div>
          </div>
          {property.description && <p className="descText">{property.description}</p>}

          <div className="metricsGrid" style={{ marginTop: 16 }}>
            <MetricCard label="AI Score" value={`${a.attractivenessScore} / 100`} tone={a.attractivenessScore >= 60 ? "positive" : a.attractivenessScore >= 40 ? "neutral" : "negative"} />
            <MetricCard label="Yield" value={fmtPct(a.yieldProxy)} tone={a.yieldProxy >= 0.06 ? "positive" : a.yieldProxy >= 0.03 ? "neutral" : "negative"} />
            <MetricCard label="Est. ADR" value={fmt$(a.estimatedAdr)} tone="info" />
            <MetricCard label="Monthly Rev." value={fmt$(a.estimatedMonthlyGrossRevenue)} tone="positive" />
            <MetricCard label="Annual NOI" value={fmt$(a.estimatedNetOperatingIncome)} tone={a.estimatedNetOperatingIncome > 0 ? "positive" : "negative"} />
            <MetricCard label="Confidence" value={a.confidence} tone={a.confidence === "High" ? "positive" : a.confidence === "Medium" ? "neutral" : "negative"} />
          </div>
        </section>

        {/* ─── Tab Bar (Grouped) ─── */}
        <div className="tabBarGrouped">
          {TAB_GROUPS.map((group) => (
            <div key={group.label} className="tabGroup">
              <span className="tabGroupLabel">{group.label}</span>
              <div className="tabGroupTabs">
                {group.tabs.map((t) => (
                  <button
                    key={t.key}
                    className={`tabBtn ${activeTab === t.key ? "tabActive" : ""}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.ai && <span className="pillAi" style={{ marginRight: 4, padding: "1px 4px", fontSize: "0.55rem" }}>AI</span>}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tab Panels ─── */}
        {activeTab === "market" && (
          <>
            {/* STR Market + Scenario Editor + Cost Breakdown + Comparables + AI Summary */}
            <section className="panel">
              <h2>STR Market Metrics</h2>
              <div className="metricsGrid">
                <MetricCard label="Estimated ADR" value={fmt$(a.estimatedAdr)} />
                <MetricCard label="Occupancy Rate" value={fmtPct(a.estimatedOccupancyRate)} />
                <MetricCard label="Comparables" value={String(a.marketMetrics.comparablesCount)} />
                <MetricCard label="Avg Reviews" value={a.marketMetrics.averageReviews.toFixed(0)} />
                <MetricCard label="Avg Distance" value={a.marketMetrics.averageDistanceMiles.toFixed(1) + " mi"} />
              </div>
            </section>

            <section className="panel">
              <h2>Financial Analysis</h2>
              <div className="metricsGrid">
                <MetricCard label="Monthly Gross Revenue" value={fmt$(a.estimatedMonthlyGrossRevenue)} />
                <MetricCard label="Annual Gross Revenue" value={fmt$(a.estimatedAnnualGrossRevenue)} />
                <MetricCard label="Operating Costs" value={fmt$(a.estimatedOperatingCost)} />
                <MetricCard label="Net Operating Income" value={fmt$(a.estimatedNetOperatingIncome)} />
                <MetricCard label="Yield Proxy" value={fmtPct(a.yieldProxy)} />
              </div>
            </section>

            {/* Cost Breakdown */}
            <section className="panel">
              <h2>Operating Cost Breakdown</h2>
              <div className="twoCol">
                <div>
                  <h3>Variable costs</h3>
                  <table className="dataTable costTable">
                    <tbody>
                      <tr><td>Management fees</td><td className="cellRight">{fmt$(cb.managementFees)}</td></tr>
                      <tr><td>Maintenance</td><td className="cellRight">{fmt$(cb.maintenanceCosts)}</td></tr>
                      <tr><td>Platform fees</td><td className="cellRight">{fmt$(cb.platformFees)}</td></tr>
                      <tr><td>Capital reserves</td><td className="cellRight">{fmt$(cb.capitalReserves)}</td></tr>
                      <tr className="rowTotal"><td>Subtotal</td><td className="cellRight">{fmt$(cb.totalVariable)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3>Fixed costs</h3>
                  <table className="dataTable costTable">
                    <tbody>
                      <tr><td>Utilities</td><td className="cellRight">{fmt$(cb.utilities)}</td></tr>
                      <tr><td>Supplies</td><td className="cellRight">{fmt$(cb.supplies)}</td></tr>
                      <tr><td>Insurance</td><td className="cellRight">{fmt$(cb.insurance)}</td></tr>
                      <tr><td>Property tax</td><td className="cellRight">{fmt$(cb.propertyTax)}</td></tr>
                      <tr className="rowTotal"><td>Subtotal</td><td className="cellRight">{fmt$(cb.totalFixed)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="totalBar">Total Operating Cost: <strong>{fmt$(cb.totalOperatingCost)}</strong> / year</div>
            </section>

            {/* Scenario Editor */}
            <section className="panel">
              <div className="rowBetween">
                <h2>Scenario Editor</h2>
                <button className="btnPrimary" disabled={isRecalculating} onClick={recalculate}>
                  {isRecalculating ? "Recalculating…" : "Recalculate ↻"}
                </button>
              </div>
              <p className="hintText">Adjust inputs and click Recalculate to rerun the analysis.</p>
              <div className="scenarioGrid">
                <div className="inputGroup"><label>Renovation budget ($)</label><input type="number" className="numInput" value={renovationCost || ""} placeholder="0" onChange={(e) => setRenovationCost(Number(e.target.value) || 0)} /></div>
                <div className="inputGroup"><label>Management fee (%)</label><input type="number" className="numInput" step="1" placeholder={String((a.assumptions.managementFeeRate * 100).toFixed(0))} onChange={(e) => handleOverride("managementFeeRate", Number(e.target.value) / 100)} /></div>
                <div className="inputGroup"><label>Maintenance (%)</label><input type="number" className="numInput" step="1" placeholder={String((a.assumptions.maintenanceRate * 100).toFixed(0))} onChange={(e) => handleOverride("maintenanceRate", Number(e.target.value) / 100)} /></div>
                <div className="inputGroup"><label>Vacancy buffer (%)</label><input type="number" className="numInput" step="0.5" placeholder={String((a.assumptions.vacancyBuffer * 100).toFixed(1))} onChange={(e) => handleOverride("vacancyBuffer", Number(e.target.value) / 100)} /></div>
                <div className="inputGroup"><label>Utilities / mo ($)</label><input type="number" className="numInput" placeholder={String(a.assumptions.utilitiesMonthly)} onChange={(e) => handleOverride("utilitiesMonthly", Number(e.target.value))} /></div>
                <div className="inputGroup"><label>Insurance / yr ($)</label><input type="number" className="numInput" placeholder={String(a.assumptions.insuranceAnnual)} onChange={(e) => handleOverride("insuranceAnnual", Number(e.target.value))} /></div>
                <div className="inputGroup"><label>Tax rate (%)</label><input type="number" className="numInput" step="0.1" placeholder={String((a.assumptions.taxRateAnnual * 100).toFixed(2))} onChange={(e) => handleOverride("taxRateAnnual", Number(e.target.value) / 100)} /></div>
                <div className="inputGroup"><label>Platform fee (%)</label><input type="number" className="numInput" step="1" placeholder={String((a.assumptions.platformFeeRate * 100).toFixed(0))} onChange={(e) => handleOverride("platformFeeRate", Number(e.target.value) / 100)} /></div>
              </div>
              <button className="toggleLink" onClick={() => setShowAssumptions(!showAssumptions)}>
                {showAssumptions ? "▾ Hide" : "▸ Show"} current assumptions
              </button>
              {showAssumptions && (
                <div className="assumptionsList">
                  <div className="assumptionsGrid">
                    <span>Management fee:</span><span>{fmtPct(a.assumptions.managementFeeRate)}</span>
                    <span>Maintenance:</span><span>{fmtPct(a.assumptions.maintenanceRate)}</span>
                    <span>Platform fee:</span><span>{fmtPct(a.assumptions.platformFeeRate)}</span>
                    <span>Capital reserve:</span><span>{fmtPct(a.assumptions.capitalReserveRate)}</span>
                    <span>Vacancy buffer:</span><span>{fmtPct(a.assumptions.vacancyBuffer)}</span>
                    <span>Utilities:</span><span>{fmt$(a.assumptions.utilitiesMonthly)} / mo</span>
                    <span>Supplies:</span><span>{fmt$(a.assumptions.suppliesMonthly)} / mo</span>
                    <span>Insurance:</span><span>{fmt$(a.assumptions.insuranceAnnual)} / yr</span>
                    <span>Tax rate:</span><span>{fmtPct(a.assumptions.taxRateAnnual)}</span>
                    <span>Seasonality:</span><span>{a.assumptions.seasonalityIndex.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Comparables Table */}
            <section className="panel">
              <h2>Comparable Rentals</h2>
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Name</th><th>Source</th><th>Type</th><th>Beds</th><th>Baths</th>
                      <th>ADR</th><th>Occupancy</th><th>Reviews</th><th>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.rentalComparables.map((c) => (
                      <tr key={c.id}>
                        <td className="cellBold">{c.name}</td>
                        <td><span className="pillSmall">{c.source}</span></td>
                        <td>{c.propertyType}</td><td>{c.bedrooms}</td><td>{c.bathrooms}</td>
                        <td>{fmt$(c.adr)}</td><td>{fmtPct(c.occupancyRate)}</td>
                        <td>{c.reviews}</td><td>{c.distanceMiles.toFixed(1)} mi</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Monthly Revenue Chart */}
            {a.monthlyRevenue && a.monthlyRevenue.length > 0 && (
              <section className="panel">
                <RevenueChart monthlyRevenue={a.monthlyRevenue} />
              </section>
            )}

            {/* AI Summary */}
            <section className="aiPanel">
              <h3><span className="pillAi" style={{ marginRight: 6 }}>AI</span> Investment Summary</h3>
              <div className="twoCol" style={{ marginTop: 12 }}>
                <div>
                  <h3 style={{ color: "var(--green)" }}>Upside factors</h3>
                  <ul className="factorList upside">{a.aiSummary.upsideFactors.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
                <div>
                  <h3 style={{ color: "var(--red)" }}>Downside / risk factors</h3>
                  <ul className="factorList downside">{a.aiSummary.downsideFactors.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              </div>
              <h3>Assumptions explained</h3>
              <ul className="factorList neutral">{a.aiSummary.assumptionsExplained.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </section>
          </>
        )}

        {activeTab === "macro" && (
          <section className="panel">
            <MacroPanel locationKey={locationKey} />
          </section>
        )}

        {activeTab === "renovation" && (
          <section className="panel">
            <RenovationPanel propertyId={id} property={property} />
          </section>
        )}

        {activeTab === "valuation" && (
          <section className="panel">
            <ValuationPanel propertyId={id} property={property} />
          </section>
        )}

        {activeTab === "financials" && (
          <section className="panel">
            <FinancialModelPanel propertyId={id} />
          </section>
        )}

        {activeTab === "sensitivity" && (
          <section className="panel">
            <SensitivityPanel propertyId={id} />
          </section>
        )}

        {activeTab === "memo" && (
          <section className="panel">
            <MemoPanel propertyId={id} />
          </section>
        )}

        {activeTab === "operations" && (
          <section className="panel">
            <OperationsPanel propertyId={id} />
          </section>
        )}

        {activeTab === "forecast" && (
          <section className="panel">
            <ForecastPanel propertyId={id} />
          </section>
        )}

        {activeTab === "montecarlo" && (
          <section className="panel">
            <MonteCarloPanel propertyId={id} />
          </section>
        )}

        {activeTab === "dealscore" && (
          <section className="panel">
            <DealScorePanel propertyId={id} />
          </section>
        )}

        {activeTab === "heatmap" && (
          <section className="panel">
            <HeatmapPanel propertyId={id} />
          </section>
        )}

        {activeTab === "waterfall" && (
          <section className="panel">
            <WaterfallPanel propertyId={id} />
          </section>
        )}
    </div>
  );
}
