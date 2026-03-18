"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAllMarketAnalytics, fetchLocations } from "@/lib/api";
import { MarketAnalytics } from "@/lib/types";
import { MetricCard } from "@/components/MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchAllMarketAnalytics()
      .then((r) => setMarkets(r.markets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pageStack fadeIn">
        <div className="skeleton skeletonBlock" />
        <div className="skeleton skeletonBlock" />
      </div>
    );
  }

  const totalProperties = markets.reduce((s, m) => s + m.propertyCount, 0);
  const totalValue = markets.reduce((s, m) => s + m.avgPrice * m.propertyCount, 0);
  const overallAvgYield = markets.length > 0
    ? markets.reduce((s, m) => s + m.avgYield * m.propertyCount, 0) / totalProperties
    : 0;
  const overallAvgScore = markets.length > 0
    ? markets.reduce((s, m) => s + m.avgScore * m.propertyCount, 0) / totalProperties
    : 0;

  const selectedMarket = selected ? markets.find((m) => m.locationKey === selected) : null;

  return (
    <div className="pageStack fadeIn">
      <section className="hero">
        <h1>Market Intelligence Dashboard</h1>
        <p>Compare STR investment markets side-by-side. Analyze pricing, yields, occupancy, and scores across {markets.length} markets.</p>
      </section>

      <section className="panel">
        <div className="metricsGrid">
          <MetricCard label="Total Markets" value={String(markets.length)} />
          <MetricCard label="Total Properties" value={String(totalProperties)} />
          <MetricCard label="Portfolio Value" value={fmt$(totalValue)} />
          <MetricCard label="Avg Yield" value={fmtPct(overallAvgYield)} />
          <MetricCard label="Avg Score" value={`${overallAvgScore.toFixed(1)}/100`} />
        </div>
      </section>

      {/* Market Cards Grid */}
      <div className="marketCardsGrid">
        {markets.map((m) => {
          const isSelected = selected === m.locationKey;
          return (
            <div
              key={m.locationKey}
              className={`panel marketCard ${isSelected ? "cardSelected" : ""}`}
              onClick={() => setSelected(isSelected ? null : m.locationKey)}
            >
              <div className="marketCardHeader">
                <h3>{m.locationKey}</h3>
                <span className="pillSmall">{m.propertyCount} properties</span>
              </div>

              <div className="marketMetricsRow">
                <div className="marketMetric">
                  <span className="marketMetricLabel">Avg ADR</span>
                  <span className="marketMetricValue">{fmt$(m.avgAdr)}</span>
                </div>
                <div className="marketMetric">
                  <span className="marketMetricLabel">Avg Occ</span>
                  <span className="marketMetricValue">{fmtPct(m.avgOccupancy)}</span>
                </div>
                <div className="marketMetric">
                  <span className="marketMetricLabel">Avg Yield</span>
                  <span className="marketMetricValue">{fmtPct(m.avgYield)}</span>
                </div>
                <div className="marketMetric">
                  <span className="marketMetricLabel">Avg Score</span>
                  <span className="marketMetricValue">{m.avgScore.toFixed(0)}</span>
                </div>
              </div>

              {/* Score Distribution Bar */}
              <div className="scoreDistBar">
                {m.scoreDistribution.excellent > 0 && (
                  <div className="scoreDistSeg scoreDistExcellent" style={{ flex: m.scoreDistribution.excellent }} title={`Excellent: ${m.scoreDistribution.excellent}`} />
                )}
                {m.scoreDistribution.good > 0 && (
                  <div className="scoreDistSeg scoreDistGood" style={{ flex: m.scoreDistribution.good }} title={`Good: ${m.scoreDistribution.good}`} />
                )}
                {m.scoreDistribution.fair > 0 && (
                  <div className="scoreDistSeg scoreDistFair" style={{ flex: m.scoreDistribution.fair }} title={`Fair: ${m.scoreDistribution.fair}`} />
                )}
                {m.scoreDistribution.poor > 0 && (
                  <div className="scoreDistSeg scoreDistPoor" style={{ flex: m.scoreDistribution.poor }} title={`Poor: ${m.scoreDistribution.poor}`} />
                )}
              </div>

              {m.macroHighlights.length > 0 && (
                <div className="marketHighlights">
                  {m.macroHighlights.slice(0, 3).map((h, i) => (
                    <span key={i} className="marketHighlightTag">{h}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Market Comparison Table */}
      <section className="panel">
        <h2>Market Comparison</h2>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Market</th>
                <th className="cellRight">Properties</th>
                <th className="cellRight">Avg Price</th>
                <th className="cellRight">$/sqft</th>
                <th className="cellRight">Avg ADR</th>
                <th className="cellRight">Avg Occ</th>
                <th className="cellRight">Avg NOI</th>
                <th className="cellRight">Avg Yield</th>
                <th className="cellRight">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.locationKey} className={selected === m.locationKey ? "rowHighlight" : ""} onClick={() => setSelected(m.locationKey)}>
                  <td className="cellBold">{m.locationKey}</td>
                  <td className="cellRight">{m.propertyCount}</td>
                  <td className="cellRight">{fmt$(m.avgPrice)}</td>
                  <td className="cellRight">{fmt$(m.avgPricePerSqft)}</td>
                  <td className="cellRight">{fmt$(m.avgAdr)}</td>
                  <td className="cellRight">{fmtPct(m.avgOccupancy)}</td>
                  <td className="cellRight">{fmt$(m.avgNoi)}</td>
                  <td className="cellRight">{fmtPct(m.avgYield)}</td>
                  <td className="cellRight">
                    <span className={`scoreBadge ${m.avgScore >= 60 ? "scoreGood" : m.avgScore >= 45 ? "scoreMid" : "scoreLow"}`}>
                      {m.avgScore.toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Selected Market Detail */}
      {selectedMarket && (
        <section className="panel">
          <h2>{selectedMarket.locationKey} — Top Properties</h2>
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th className="cellRight">Score</th>
                  <th className="cellRight">Yield</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedMarket.topProperties.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td className="cellBold">{p.address}</td>
                    <td className="cellRight">
                      <span className={`scoreBadge ${p.score >= 60 ? "scoreGood" : p.score >= 45 ? "scoreMid" : "scoreLow"}`}>
                        {p.score.toFixed(0)}
                      </span>
                    </td>
                    <td className="cellRight">{fmtPct(p.yield)}</td>
                    <td><Link href={`/property/${p.id}`}>View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
