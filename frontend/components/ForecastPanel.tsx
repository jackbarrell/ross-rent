"use client";

import { useEffect, useState } from "react";
import { fetchForecastVsActual } from "@/lib/api";
import { ForecastVsActual } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

function errorColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 5) return "var(--green)";
  if (abs <= 15) return "var(--amber)";
  return "var(--red)";
}

export function ForecastPanel({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<(ForecastVsActual & { hasData: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecastVsActual(propertyId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Loading forecast comparison…</p>;
  if (!data || !data.hasData) {
    return (
      <div className="panelStack">
        <h2>Forecast vs Actual</h2>
        <p className="hintText">No operations data available yet. This view will compare predicted vs actual performance once the property is operational.</p>
      </div>
    );
  }

  return (
    <div className="panelStack">
      <h2>Forecast vs Actual</h2>
      <p className="hintText">Period: {data.period}</p>

      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="cellRight">Predicted</th>
              <th className="cellRight">Actual</th>
              <th className="cellRight">Variance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="cellBold">Average Daily Rate</td>
              <td className="cellRight">{fmt$(data.predictedAdr)}</td>
              <td className="cellRight">{fmt$(data.actualAdr)}</td>
              <td className="cellRight" style={{ color: errorColor(data.adrErrorPct) }}>
                {data.adrErrorPct > 0 ? "+" : ""}{data.adrErrorPct}%
              </td>
            </tr>
            <tr>
              <td className="cellBold">Occupancy Rate</td>
              <td className="cellRight">{fmtPct(data.predictedOccupancy)}</td>
              <td className="cellRight">{fmtPct(data.actualOccupancy)}</td>
              <td className="cellRight" style={{ color: errorColor(data.occupancyErrorPct) }}>
                {data.occupancyErrorPct > 0 ? "+" : ""}{data.occupancyErrorPct}%
              </td>
            </tr>
            <tr>
              <td className="cellBold">Annual Revenue (annualised)</td>
              <td className="cellRight">{fmt$(data.predictedRevenue)}</td>
              <td className="cellRight">{fmt$(data.actualRevenue)}</td>
              <td className="cellRight" style={{ color: errorColor(data.revenueErrorPct) }}>
                {data.revenueErrorPct > 0 ? "+" : ""}{data.revenueErrorPct}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* AI Explanation */}
      <div className="panel" style={{ marginTop: 16, background: "var(--accent-light)" }}>
        <h3>AI Analysis</h3>
        <p>{data.aiExplanation}</p>
      </div>

      {data.adjustmentSuggestions.length > 0 && (
        <div>
          <h3>Recommended Adjustments</h3>
          <ul className="factorList upside">
            {data.adjustmentSuggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
