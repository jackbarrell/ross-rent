"use client";

import { useEffect, useState } from "react";
import { fetchSensitivity } from "@/lib/api";
import { SensitivityResult } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export function SensitivityPanel({ propertyId }: { propertyId: string }) {
  const [results, setResults] = useState<SensitivityResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSensitivity(propertyId)
      .then((r) => setResults(r.sensitivity))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Running sensitivity scenarios…</p>;
  if (!results || results.length === 0) return <p className="error">Could not run sensitivity analysis.</p>;

  return (
    <div className="panelStack">
      <h2>Sensitivity Analysis</h2>
      <p className="hintText">How key variables affect returns. Base case highlighted.</p>

      {results.map((r) => (
        <div key={r.variable} style={{ marginTop: 16 }}>
          <h3>{r.variable}</h3>
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th className="cellRight">NOI</th>
                  <th className="cellRight">Yr 1 Cashflow</th>
                  <th className="cellRight">IRR</th>
                  <th className="cellRight">Cash-on-Cash</th>
                </tr>
              </thead>
              <tbody>
                {r.scenarios.map((s, i) => {
                  const isBase = s.label === "Base" || s.label.includes("Base");
                  return (
                    <tr key={i} style={isBase ? { background: "var(--surface2)" } : undefined}>
                      <td className="cellBold">{s.label}</td>
                      <td className="cellRight">{fmt$(s.noi)}</td>
                      <td className="cellRight" style={{ color: s.cashflow >= 0 ? "var(--green)" : "var(--red)" }}>
                        {fmt$(s.cashflow)}
                      </td>
                      <td className="cellRight">{fmtPct(s.irr)}</td>
                      <td className="cellRight">{fmtPct(s.cashOnCash)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
