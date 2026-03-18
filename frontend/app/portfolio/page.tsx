"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPortfolio, fetchCompanyAccounting } from "@/lib/api";
import { CompanyPL, PortfolioSummary } from "@/lib/types";
import { MetricCard } from "@/components/MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [accounting, setAccounting] = useState<CompanyPL | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"portfolio" | "accounting">("portfolio");

  useEffect(() => {
    Promise.all([
      fetchPortfolio(),
      fetchCompanyAccounting(),
    ])
      .then(([p, a]) => { setPortfolio(p); setAccounting(a); })
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

  return (
    <div className="pageStack fadeIn">
      <div className="rowBetween">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`tabBtn ${tab === "portfolio" ? "tabActive" : ""}`}
            onClick={() => setTab("portfolio")}
          >
            Portfolio View
          </button>
          <button
            className={`tabBtn ${tab === "accounting" ? "tabActive" : ""}`}
            onClick={() => setTab("accounting")}
          >
            Company P&L
          </button>
        </div>
      </div>

      {tab === "portfolio" && portfolio && (
        <>
          <section className="hero">
            <h1>Portfolio Overview</h1>
            <p>{portfolio.totalProperties} properties · Total value: {fmt$(portfolio.totalPortfolioValue)}</p>
          </section>

          <section className="panel">
            <div className="metricsGrid">
              <MetricCard label="Total Properties" value={String(portfolio.totalProperties)} />
              <MetricCard label="Portfolio Value" value={fmt$(portfolio.totalPortfolioValue)} />
              <MetricCard label="Est. Annual Revenue" value={fmt$(portfolio.totalEstimatedRevenue)} />
              <MetricCard label="Est. Annual NOI" value={fmt$(portfolio.totalEstimatedNoi)} />
              <MetricCard label="Avg Yield" value={fmtPct(portfolio.averageYield)} />
              <MetricCard label="Avg Score" value={`${portfolio.averageScore}/100`} />
            </div>
          </section>

          <section className="panel">
            <h2>Properties</h2>
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Location</th>
                    <th className="cellRight">List Price</th>
                    <th className="cellRight">Est. Revenue</th>
                    <th className="cellRight">Est. NOI</th>
                    <th className="cellRight">Yield</th>
                    <th className="cellRight">Score</th>
                    <th>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.properties.map((p) => (
                    <tr key={p.propertyId}>
                      <td className="cellBold">
                        <Link href={`/property/${p.propertyId}`}>{p.address}</Link>
                      </td>
                      <td>{p.city}, {p.state}</td>
                      <td className="cellRight">{fmt$(p.listPrice)}</td>
                      <td className="cellRight">{fmt$(Math.round(p.estimatedRevenue))}</td>
                      <td className="cellRight">{fmt$(Math.round(p.estimatedNoi))}</td>
                      <td className="cellRight">{fmtPct(p.yieldProxy)}</td>
                      <td className="cellRight">
                        <span className={`scoreBadge ${p.score >= 65 ? "scoreGood" : p.score >= 45 ? "scoreMid" : "scoreLow"}`}>
                          {p.score.toFixed(0)}
                        </span>
                      </td>
                      <td>
                        {p.hasOperationsData
                          ? <span><span className="statusDot statusActive" />Active</span>
                          : <span style={{ color: "var(--muted)" }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "accounting" && accounting && (
        <>
          <section className="hero">
            <h1>Company P&L</h1>
            <p>Period: {accounting.period} · {accounting.propertyCount} properties</p>
          </section>

          <section className="panel">
            <div className="metricsGrid">
              <MetricCard label="Total Income" value={fmt$(accounting.totalIncome)} />
              <MetricCard label="Total Expenses" value={fmt$(accounting.totalExpenses)} />
              <MetricCard label="Net Income" value={fmt$(accounting.netIncome)} />
              <MetricCard label="Properties" value={String(accounting.propertyCount)} />
            </div>
          </section>

          {accounting.properties.map((pp) => (
            <section key={pp.propertyId} className="panel">
              <div className="rowBetween">
                <h3 style={{ margin: 0 }}>
                  <Link href={`/property/${pp.propertyId}`}>{pp.address}</Link>
                </h3>
                <span style={{ fontWeight: 700, color: pp.netIncome >= 0 ? "var(--green)" : "var(--red)" }}>
                  Net: {fmt$(pp.netIncome)}
                </span>
              </div>
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="cellRight">Amount</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pp.entries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td><span className="pillSmall">{e.category}</span></td>
                        <td>{e.description}</td>
                        <td className="cellRight" style={{ color: e.type === "income" ? "var(--green)" : "var(--red)" }}>
                          {e.type === "income" ? "+" : "-"}{fmt$(e.amount)}
                        </td>
                        <td>{e.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
