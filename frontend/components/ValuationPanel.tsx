"use client";

import { useEffect, useState } from "react";
import { fetchRenovation, fetchValuation } from "@/lib/api";
import { PropertyListing, ValuationResult } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export function ValuationPanel({ propertyId, property }: { propertyId: string; property: PropertyListing }) {
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First infer renovation cost, then get valuation
    fetchRenovation(propertyId)
      .then((reno) => fetchValuation(propertyId, reno.totalCapexEstimate))
      .then(setValuation)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Estimating post-renovation value…</p>;
  if (!valuation) return <p className="error">Could not generate valuation.</p>;

  const equityPositive = valuation.equityCreated > 0;

  return (
    <div className="panelStack">
      <h2>Post-Renovation Valuation</h2>

      <div className="metricsGrid">
        <MetricCard label="Before Value (as-is)" value={fmt$(valuation.beforeValue)} />
        <MetricCard label="Renovation Cost" value={fmt$(valuation.renovationCost)} />
        <MetricCard label="After Value (renovated)" value={fmt$(valuation.afterValue)} />
        <MetricCard label="Equity Created" value={fmt$(valuation.equityCreated)} />
        <MetricCard label="Renovated $/sqft" value={fmt$(valuation.renovatedPricePerSqft)} />
      </div>

      <div className={`totalBar ${equityPositive ? "" : "totalBarNeg"}`}>
        {equityPositive ? "✓" : "⚠"} Equity created: <strong>{fmt$(valuation.equityCreated)}</strong>
        {!equityPositive && <span style={{ marginLeft: 8 }}>(negative — renovation costs exceed value uplift)</span>}
      </div>

      {/* Comparable Sales Used */}
      <h3>Comparable Sales Used</h3>
      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Address</th>
              <th>Beds</th>
              <th>Baths</th>
              <th>Sqft</th>
              <th>Quality</th>
              <th>Sold Date</th>
              <th className="cellRight">Sold Price</th>
              <th className="cellRight">$/sqft</th>
            </tr>
          </thead>
          <tbody>
            {valuation.comparablesUsed.map((c) => (
              <tr key={c.id}>
                <td className="cellBold">{c.address}</td>
                <td>{c.bedrooms}</td>
                <td>{c.bathrooms}</td>
                <td>{c.sqft.toLocaleString()}</td>
                <td><span className={`pillSmall ${c.qualityLevel === "renovated" ? "pillGreen" : ""}`}>{c.qualityLevel}</span></td>
                <td>{c.soldDate}</td>
                <td className="cellRight">{fmt$(c.soldPrice)}</td>
                <td className="cellRight">${c.pricePerSqft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="hintText" style={{ marginTop: 12 }}>{valuation.methodology}</p>
    </div>
  );
}
