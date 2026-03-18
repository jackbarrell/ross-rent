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
