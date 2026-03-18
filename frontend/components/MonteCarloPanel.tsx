"use client";

import { useEffect, useState } from "react";
import { fetchMonteCarlo } from "@/lib/api";
import { MonteCarloResult } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }
function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export function MonteCarloPanel({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<MonteCarloResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonteCarlo(propertyId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Running {1000} Monte Carlo simulations…</p>;
  if (!data) return <p className="error">Could not run simulation.</p>;

  const maxFreq = Math.max(...data.histogram.map((b) => b.frequency));

  return (
    <div className="panelStack">
      <h2>Monte Carlo Simulation</h2>
      <p className="hintText">{data.simulations.toLocaleString()} simulations with randomized ADR, occupancy, appreciation, costs, and interest rates.</p>

      <div className="metricsGrid">
        <MetricCard label="Median IRR" value={fmtPct(data.irr.median)} />
        <MetricCard label="P5 → P95 IRR" value={`${fmtPct(data.irr.p5)} – ${fmtPct(data.irr.p95)}`} />
        <MetricCard label="Prob. of Loss" value={fmtPct(data.probabilityOfLoss)} />
        <MetricCard label="Prob. IRR > 10%" value={fmtPct(data.probabilityAbove10Pct)} />
        <MetricCard label="Median Yr5 Equity" value={fmt$(data.year5Equity.median)} />
        <MetricCard label="Median CoC" value={fmtPct(data.cashOnCash.median)} />
      </div>

      {/* IRR Distribution Histogram */}
      <div className="mcHistogram">
        <h3>IRR Distribution</h3>
        <div className="mcHistogramBars">
          {data.histogram.map((bucket, i) => {
            const heightPct = maxFreq > 0 ? (bucket.frequency / maxFreq) * 100 : 0;
            const isZeroOrNeg = bucket.max <= 0;
            return (
              <div key={i} className="mcHistogramCol" title={`${bucket.rangeLabel}: ${bucket.count} sims (${(bucket.frequency * 100).toFixed(1)}%)`}>
                <div className="mcHistogramBarTrack">
                  <div
                    className={`mcHistogramBarFill ${isZeroOrNeg ? "mcBarNeg" : "mcBarPos"}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                {i % 4 === 0 && (
                  <span className="mcHistogramLabel">{(bucket.min * 100).toFixed(0)}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mcHistogramAxis">
          <span>← Lower Returns</span>
          <span>Higher Returns →</span>
        </div>
      </div>

      {/* Percentile Table */}
      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Percentile</th>
              <th className="cellRight">IRR</th>
              <th className="cellRight">Total Return</th>
              <th className="cellRight">Yr5 Equity</th>
            </tr>
          </thead>
          <tbody>
            {data.percentiles.map((p) => (
              <tr key={p.percentile} className={p.percentile === 50 ? "rowHighlight" : ""}>
                <td className="cellBold">P{p.percentile}</td>
                <td className="cellRight" style={{ color: p.irr >= 0 ? "var(--green)" : "var(--red)" }}>
                  {fmtPct(p.irr)}
                </td>
                <td className="cellRight">{fmtPct(p.totalReturn)}</td>
                <td className="cellRight">{fmt$(p.equity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Distribution Stats */}
      <div className="twoCol">
        <div>
          <h3>IRR Statistics</h3>
          <div className="assumptionsGrid">
            <span>Mean:</span><span>{fmtPct(data.irr.mean)}</span>
            <span>Std Dev:</span><span>{fmtPct(data.irr.stdDev)}</span>
            <span>Min:</span><span>{fmtPct(data.irr.min)}</span>
            <span>Max:</span><span>{fmtPct(data.irr.max)}</span>
          </div>
        </div>
        <div>
          <h3>NOI Statistics</h3>
          <div className="assumptionsGrid">
            <span>Mean:</span><span>{fmt$(data.noi.mean)}</span>
            <span>Std Dev:</span><span>{fmt$(data.noi.stdDev)}</span>
            <span>P25:</span><span>{fmt$(data.noi.p25)}</span>
            <span>P75:</span><span>{fmt$(data.noi.p75)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
