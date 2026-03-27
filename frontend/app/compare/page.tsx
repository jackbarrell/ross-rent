"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchProperties, fetchLocations, fetchComparison } from "@/lib/api";
import { ComparisonRow, PropertyListing } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export default function ComparePage() {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparisons, setComparisons] = useState<ComparisonRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocations().then((r) => {
      setLocations(r.locations);
      if (r.locations.length > 0) setSelectedLocation(r.locations[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    fetchProperties(selectedLocation).then((r) => setProperties(r.properties));
  }, [selectedLocation]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  };

  const runComparison = async () => {
    if (selected.size < 2) return;
    setLoading(true);
    try {
      const result = await fetchComparison(Array.from(selected));
      setComparisons(result.comparisons);
    } catch {
      setComparisons(null);
    } finally { setLoading(false); }
  };

  return (
    <div className="pageStack fadeIn">
      <Link href="/" className="backLink">← Back</Link>
      <h1>Property Comparison</h1>
      <p className="hintText">Select 2–5 properties to compare side by side.</p>

      <section className="panel">
        <div className="rowBetween">
          <select className="numInput" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={{ minWidth: 200 }}>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button className="btnPrimary" disabled={selected.size < 2 || loading} onClick={runComparison}>
            {loading ? "Comparing…" : `Compare ${selected.size} Properties`}
          </button>
        </div>

        <div className="tableWrap" style={{ marginTop: 12 }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th></th>
                <th>Address</th>
                <th>Type</th>
                <th>Beds</th>
                <th className="cellRight">List Price</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} style={selected.has(p.id) ? { background: "var(--surface2)" } : undefined}>
                  <td>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td className="cellBold">{p.address}</td>
                  <td>{p.propertyType}</td>
                  <td>{p.bedrooms}</td>
                  <td className="cellRight">{fmt$(p.listPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {comparisons && comparisons.length > 0 && (
        <section className="panel">
          <h2>Comparison Results</h2>
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Metric</th>
                  {comparisons.map((c) => (
                    <th key={c.propertyId} className="cellRight">{(c.address ?? "").split(",")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cellBold">List Price</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmt$(c.listPrice)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Beds / Baths</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{c.bedrooms} / {c.bathrooms}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Sqft</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{c.sqft.toLocaleString()}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Estimated ADR</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmt$(c.estimatedAdr)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Occupancy</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmtPct(c.estimatedOccupancy)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Annual Revenue</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmt$(c.annualRevenue)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">NOI</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmt$(c.noi)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Yield</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmtPct(c.yieldProxy)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">AI Score</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{c.score}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">IRR</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmtPct(c.irr)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Cash-on-Cash</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmtPct(c.cashOnCash)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">DSCR</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{c.dscr.toFixed(2)}x</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Reno Cost</td>
                  {comparisons.map((c) => <td key={c.propertyId} className="cellRight">{fmt$(c.renovationCost)}</td>)}
                </tr>
                <tr>
                  <td className="cellBold">Equity Created</td>
                  {comparisons.map((c) => (
                    <td key={c.propertyId} className="cellRight" style={{ color: c.equityCreated >= 0 ? "var(--green)" : "var(--red)" }}>
                      {fmt$(c.equityCreated)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
