"use client";

import { useEffect, useState } from "react";
import { fetchFinancialModel, fetchRenovation } from "@/lib/api";
import { FinancialModel } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export function FinancialModelPanel({ propertyId }: { propertyId: string }) {
  const [model, setModel] = useState<FinancialModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenovation(propertyId)
      .then((reno) => fetchFinancialModel(propertyId, reno.totalCapexEstimate))
      .then(setModel)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Generating 5-year financial model…</p>;
  if (!model) return <p className="error">Could not generate financial model.</p>;

  const m = model.mortgageAssumptions;

  return (
    <div className="panelStack">
      <h2>5-Year Financial Model</h2>

      <div className="metricsGrid">
        <MetricCard label="Purchase Price" value={fmt$(model.purchasePrice)} />
        <MetricCard label="Renovation Cost" value={fmt$(model.renovationCost)} />
        <MetricCard label="Down Payment" value={fmt$(model.downPayment)} />
        <MetricCard label="Loan Amount" value={fmt$(model.loanAmount)} />
        <MetricCard label="Interest Rate" value={fmtPct(m.interestRate)} />
        <MetricCard label="LTV" value={fmtPct(m.ltv)} />
        <MetricCard label="Est. IRR" value={fmtPct(model.irr)} />
        <MetricCard label="Total Return" value={fmtPct(model.totalReturn)} />
        <MetricCard label="Cash-on-Cash (Yr 1)" value={fmtPct(model.cashOnCash)} />
        <MetricCard label="DSCR (Yr 1)" value={model.dscr.toFixed(2) + "x"} />
      </div>

      {/* 5-Year P&L Table */}
      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Year</th>
              <th className="cellRight">Revenue</th>
              <th className="cellRight">Op Costs</th>
              <th className="cellRight">NOI</th>
              <th className="cellRight">Mortgage</th>
              <th className="cellRight">Cashflow</th>
              <th className="cellRight">Prop. Value</th>
              <th className="cellRight">Equity</th>
              <th className="cellRight">CoC</th>
              <th className="cellRight">DSCR</th>
              <th className="cellRight">Cum. Cashflow</th>
            </tr>
          </thead>
          <tbody>
            {model.years.map((y) => (
              <tr key={y.year}>
                <td className="cellBold">{y.year}</td>
                <td className="cellRight">{fmt$(y.grossRevenue)}</td>
                <td className="cellRight">{fmt$(y.operatingCosts)}</td>
                <td className="cellRight">{fmt$(y.netOperatingIncome)}</td>
                <td className="cellRight">{fmt$(y.mortgagePayment)}</td>
                <td className="cellRight" style={{ color: y.cashflow >= 0 ? "var(--green)" : "var(--red)" }}>
                  {fmt$(y.cashflow)}
                </td>
                <td className="cellRight">{fmt$(y.propertyValue)}</td>
                <td className="cellRight">{fmt$(y.equity)}</td>
                <td className="cellRight">{fmtPct(y.cashOnCash)}</td>
                <td className="cellRight">{y.dscr.toFixed(2)}x</td>
                <td className="cellRight">{fmt$(y.cumulativeCashflow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Equity Build-Up & Cashflow Chart */}
      <div className="chartContainer">
        <h3>Equity Build-Up & Cumulative Cashflow</h3>
        <div className="barChart">
          {model.years.map((y) => {
            const maxVal = Math.max(...model.years.map((yr) => Math.max(yr.equity, Math.abs(yr.cumulativeCashflow))));
            const equityPct = maxVal > 0 ? (y.equity / maxVal) * 100 : 0;
            const cashflowPct = maxVal > 0 ? (Math.abs(y.cumulativeCashflow) / maxVal) * 100 : 0;
            return (
              <div key={y.year} className="barGroup">
                <div className="barLabels">
                  <span className="barValue">{fmt$(y.equity)}</span>
                  <span className="barValueSecondary" style={{ color: y.cumulativeCashflow >= 0 ? "var(--green)" : "var(--red)" }}>
                    {fmt$(y.cumulativeCashflow)}
                  </span>
                </div>
                <div className="barTrack">
                  <div className="barFill barFillAccent" style={{ width: `${equityPct}%` }} />
                </div>
                <div className="barTrack">
                  <div
                    className={`barFill ${y.cumulativeCashflow >= 0 ? "barFillGreen" : "barFillRed"}`}
                    style={{ width: `${cashflowPct}%` }}
                  />
                </div>
                <span className="barLabel">Yr {y.year}</span>
              </div>
            );
          })}
        </div>
        <div className="chartLegend">
          <span><span className="legendDot" style={{ background: "var(--accent)" }} /> Equity</span>
          <span><span className="legendDot" style={{ background: "var(--green)" }} /> Cum. Cashflow</span>
        </div>
      </div>

      {/* Refinance Scenario */}
      <div className="totalBar">
        <strong>Refinance Scenario (Year {model.refinanceScenario.refinanceYear}):</strong>{" "}
        New Loan: {fmt$(model.refinanceScenario.newLoanAmount)} ·
        Equity Pull-Out: {fmt$(model.refinanceScenario.equityPulledOut)} ·
        New Annual Payment: {fmt$(model.refinanceScenario.newAnnualPayment)}
      </div>
    </div>
  );
}
