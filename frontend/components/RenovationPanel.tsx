"use client";

import { useEffect, useState } from "react";
import { fetchRenovation } from "@/lib/api";
import { PropertyListing, RenovationEstimate } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export function RenovationPanel({ propertyId, property }: { propertyId: string; property: PropertyListing }) {
  const [estimate, setEstimate] = useState<RenovationEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenovation(propertyId)
      .then(setEstimate)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Analysing renovation scope…</p>;
  if (!estimate) return <p className="error">Could not generate renovation estimate.</p>;

  return (
    <div className="panelStack">
      <div className="rowBetween">
        <h2>Renovation Cost Estimate</h2>
        <span className="pillSmall">{estimate.methodology === "ai-inferred" ? "AI-Inferred" : "Manual"}</span>
      </div>

      <p className="hintText">
        Based on analysis of the property description ({property.bedrooms} bd / {property.bathrooms} ba / {property.sqft.toLocaleString()} sqft).
        Timeline estimate: <strong>{estimate.timelineWeeks} weeks</strong>.
      </p>

      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Work Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th className="cellRight">Low</th>
              <th className="cellRight">High</th>
              <th className="cellRight">Estimate</th>
            </tr>
          </thead>
          <tbody>
            {estimate.items.map((item, i) => (
              <tr key={i}>
                <td className="cellBold">{item.label}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td className="cellRight">{fmt$(item.lowCost)}</td>
                <td className="cellRight">{fmt$(item.highCost)}</td>
                <td className="cellRight">{fmt$(item.estimatedCost)}</td>
              </tr>
            ))}
            <tr className="rowTotal">
              <td colSpan={3}>Total CAPEX</td>
              <td className="cellRight">{fmt$(estimate.totalCapexLow)}</td>
              <td className="cellRight">{fmt$(estimate.totalCapexHigh)}</td>
              <td className="cellRight">{fmt$(estimate.totalCapexEstimate)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="totalBar">
        Estimated renovation budget: <strong>{fmt$(estimate.totalCapexEstimate)}</strong>
        <span style={{ marginLeft: 16, color: "var(--muted)" }}>
          (range: {fmt$(estimate.totalCapexLow)} – {fmt$(estimate.totalCapexHigh)})
        </span>
      </div>
    </div>
  );
}
