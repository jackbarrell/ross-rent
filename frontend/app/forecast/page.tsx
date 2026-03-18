"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchProperties, fetchForecastVsActual } from "@/lib/api";
import { ForecastVsActual, PropertyListing } from "@/lib/types";
import { MetricCard } from "@/components/MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

function errorColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 5) return "var(--green)";
  if (abs <= 15) return "var(--amber)";
  return "var(--red)";
}

interface ForecastRow {
  property: PropertyListing;
  forecast: ForecastVsActual;
}

export default function ForecastPage() {
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ForecastRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { properties } = await fetchProperties("");
        const results: ForecastRow[] = [];
        for (const property of properties) {
          const forecast = await fetchForecastVsActual(property.id);
          if (forecast.hasData) {
            results.push({ property, forecast });
          }
        }
        setRows(results);
        if (results.length > 0) setSelected(results[0]);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="pageStack fadeIn">
        <div className="skeleton skeletonBlock" />
        <div className="skeleton skeletonBlock" />
      </div>
    );
  }

  return (
    <div className="pageStack fadeIn">
      <section className="hero">
        <h1>Forecast vs Actual</h1>
        <p>Compare predicted performance against real booking and revenue data with AI-powered variance analysis.</p>
      </section>

      {rows.length === 0 ? (
        <section className="panel">
          <p className="hintText">No properties with operational data available yet.</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>Properties with Operations Data ({rows.length})</h2>
            <div className="grid">
              {rows.map((r) => (
                <button
                  key={r.property.id}
                  className={`card ${selected?.property.id === r.property.id ? "cardSelected" : ""}`}
                  onClick={() => setSelected(r)}
                  style={{ cursor: "pointer", textAlign: "left", border: selected?.property.id === r.property.id ? "1px solid var(--accent)" : undefined }}
                >
                  <strong style={{ color: "var(--text)" }}>{r.property.address}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    {r.property.city}, {r.property.state}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Revenue Variance:{" "}
                    <span style={{ color: errorColor(r.forecast.revenueErrorPct), fontWeight: 600 }}>
                      {r.forecast.revenueErrorPct > 0 ? "+" : ""}{r.forecast.revenueErrorPct}%
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <>
              <section className="panel">
                <h2>
                  <Link href={`/property/${selected.property.id}`}>{selected.property.address}</Link>
                  {" "}— Forecast Comparison
                </h2>
                <p className="hintText">Period: {selected.forecast.period}</p>

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
                        <td className="cellRight">{fmt$(selected.forecast.predictedAdr)}</td>
                        <td className="cellRight">{fmt$(selected.forecast.actualAdr)}</td>
                        <td className="cellRight" style={{ color: errorColor(selected.forecast.adrErrorPct), fontWeight: 600 }}>
                          {selected.forecast.adrErrorPct > 0 ? "+" : ""}{selected.forecast.adrErrorPct}%
                        </td>
                      </tr>
                      <tr>
                        <td className="cellBold">Occupancy Rate</td>
                        <td className="cellRight">{fmtPct(selected.forecast.predictedOccupancy)}</td>
                        <td className="cellRight">{fmtPct(selected.forecast.actualOccupancy)}</td>
                        <td className="cellRight" style={{ color: errorColor(selected.forecast.occupancyErrorPct), fontWeight: 600 }}>
                          {selected.forecast.occupancyErrorPct > 0 ? "+" : ""}{selected.forecast.occupancyErrorPct}%
                        </td>
                      </tr>
                      <tr>
                        <td className="cellBold">Annual Revenue (annualised)</td>
                        <td className="cellRight">{fmt$(selected.forecast.predictedRevenue)}</td>
                        <td className="cellRight">{fmt$(selected.forecast.actualRevenue)}</td>
                        <td className="cellRight" style={{ color: errorColor(selected.forecast.revenueErrorPct), fontWeight: 600 }}>
                          {selected.forecast.revenueErrorPct > 0 ? "+" : ""}{selected.forecast.revenueErrorPct}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="aiPanel">
                <h3><span className="pillAi" style={{ marginRight: 6 }}>AI</span> Variance Analysis</h3>
                <p>{selected.forecast.aiExplanation}</p>
              </section>

              {selected.forecast.adjustmentSuggestions.length > 0 && (
                <section className="panel">
                  <h3 style={{ margin: "0 0 8px" }}>Recommended Adjustments</h3>
                  <ul className="factorList upside">
                    {selected.forecast.adjustmentSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
