"use client";

import { useEffect, useState } from "react";
import { fetchWaterfall, fetchBreakEven } from "@/lib/api";
import { WaterfallAnalysis, BreakEvenAnalysis } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export function WaterfallPanel({ propertyId }: { propertyId: string }) {
  const [waterfall, setWaterfall] = useState<WaterfallAnalysis | null>(null);
  const [breakEven, setBreakEven] = useState<BreakEvenAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchWaterfall(propertyId),
      fetchBreakEven(propertyId),
    ])
      .then(([w, b]) => { setWaterfall(w); setBreakEven(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Calculating waterfall…</p>;
  if (!waterfall) return <p className="error">Could not generate waterfall.</p>;

  const maxAbsVal = Math.max(...waterfall.steps.map((s) => Math.abs(s.value)));

  return (
    <div className="panelStack">
      <h2>Investment Waterfall</h2>

      <div className="metricsGrid">
        <MetricCard label="Total Return" value={fmtPct(waterfall.totalReturn)} />
        <MetricCard label="Equity Multiple" value={waterfall.equityMultiple.toFixed(2) + "x"} />
      </div>

      {/* Waterfall Chart */}
      <div className="waterfallChart">
        {waterfall.steps.map((step, i) => {
          const widthPct = maxAbsVal > 0 ? (Math.abs(step.value) / maxAbsVal) * 100 : 0;
          return (
            <div key={i} className="waterfallRow">
              <div className="waterfallLabel">{step.label}</div>
              <div className="waterfallBarArea">
                <div className="waterfallBarTrack">
                  <div
                    className={`waterfallBarFill ${step.type === "negative" ? "waterfallNeg" : step.type === "subtotal" ? "waterfallSubtotal" : "waterfallPos"}`}
                    style={{ width: `${Math.min(widthPct, 100)}%` }}
                  />
                </div>
                <span className="waterfallValue" style={{ color: step.value >= 0 ? "var(--green)" : "var(--red)" }}>
                  {step.value >= 0 ? "+" : ""}{fmt$(step.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Break-Even Analysis */}
      {breakEven && (
        <>
          <h2>Break-Even Analysis</h2>
          <div className="metricsGrid">
            <MetricCard label="Break-Even Occupancy" value={fmtPct(breakEven.breakEvenOccupancy)} />
            <MetricCard label="Current Occupancy" value={fmtPct(breakEven.currentOccupancy)} />
            <MetricCard label="Safety Margin" value={fmtPct(breakEven.safetyMarginOccupancy)} />
            <MetricCard label="Break-Even ADR" value={fmt$(breakEven.breakEvenAdr)} />
            <MetricCard label="Current ADR" value={fmt$(breakEven.currentAdr)} />
            <MetricCard label="ADR Safety Margin" value={fmt$(breakEven.safetyMarginAdr)} />
          </div>

          {/* Break-Even Gauge */}
          <div className="breakEvenGauges">
            <div className="gaugeItem">
              <h3>Occupancy Buffer</h3>
              <div className="gaugeTrack">
                <div className="gaugeBreakEven" style={{ left: `${Math.min(breakEven.breakEvenOccupancy * 100, 100)}%` }} />
                <div className="gaugeCurrent" style={{ left: `${Math.min(breakEven.currentOccupancy * 100, 100)}%` }} />
                <div className="gaugeFill" style={{ width: `${Math.min(breakEven.currentOccupancy * 100, 100)}%` }} />
              </div>
              <div className="gaugeLabels">
                <span>0%</span>
                <span style={{ color: "var(--red)" }}>BE: {fmtPct(breakEven.breakEvenOccupancy)}</span>
                <span style={{ color: "var(--green)" }}>Current: {fmtPct(breakEven.currentOccupancy)}</span>
              </div>
            </div>
          </div>

          {breakEven.daysToBreakEven > 0 ? (
            <div className="totalBar">
              Payback period: <strong>{Math.round(breakEven.daysToBreakEven / 365 * 10) / 10} years</strong> ({breakEven.daysToBreakEven.toLocaleString()} days)
            </div>
          ) : (
            <div className="totalBar totalBarNeg">
              ⚠ Investment does not break even at current projections
            </div>
          )}
        </>
      )}
    </div>
  );
}
