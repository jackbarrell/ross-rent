"use client";

import { useEffect, useState } from "react";
import { fetchForecastVsActual, applyForecastCalibration } from "@/lib/api";
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
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);

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
      <div className="aiPanel" style={{ marginTop: 16 }}>
        <h3><span className="pillAi" style={{ marginRight: 6 }}>AI</span> Variance Analysis</h3>
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

      {data.adjustedAssumptions && data.adjustedAssumptions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Calibrated Assumptions</h3>
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Field</th>
                  <th className="cellRight">Original</th>
                  <th className="cellRight">Suggested</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.adjustedAssumptions.map((adj, i) => (
                  <tr key={i}>
                    <td className="cellBold">{adj.field}</td>
                    <td className="cellRight">{adj.originalValue}</td>
                    <td className="cellRight" style={{ color: "var(--green)" }}>{adj.suggestedValue}</td>
                    <td>{adj.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btnPrimary"
            style={{ marginTop: 12 }}
            disabled={calibrating || calibrated}
            onClick={async () => {
              setCalibrating(true);
              try {
                await applyForecastCalibration(propertyId);
                setCalibrated(true);
              } catch {} finally { setCalibrating(false); }
            }}
          >
            {calibrated ? "✓ Calibration Applied" : calibrating ? "Applying…" : "Apply Calibrated Assumptions"}
          </button>
        </div>
      )}
    </div>
  );
}
